/**
 * Playwright WebSocket Integration Tests — Notifications Real-time
 *
 * Mục tiêu: Chứng minh rằng thông báo xuất hiện qua WebSocket (Socket.io)
 * mà KHÔNG cần client reload trang — sử dụng real NestJS server và real DB.
 *
 * Event triggers thực tế từ production code:
 *   - comment.added  → notifications.service (COMMENT_ADDED) + gateway.emitNotification
 *                    → gateway.emitNewComment (cho issue room)
 *
 * Setup: Playwright khởi động server nếu chưa chạy (webServer config).
 * Không import bất kỳ module NestJS nào để tránh lỗi esbuild + decorator.
 */

import { test, expect } from '@playwright/test';
import { io, Socket } from 'socket.io-client';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const WS_URL   = process.env.WS_URL   ?? 'http://localhost:3001';
const API = `${BASE_URL}/api`;

// Unique suffix để không bị conflict khi chạy lại
const RUN_ID  = Date.now();
const EMAIL_A = `pw_a_${RUN_ID}@test.local`;
const EMAIL_B = `pw_b_${RUN_ID}@test.local`;
const PASSWORD = 'Password1!';

// ─── Shared state (workers: 1 → cùng worker process) ─────────────────────────
let tokenA: string;
let tokenB: string;
let userAId: string;
let userBId: string;
let projectId: string;
let issueKey: string; // e.g. "PWT-1"

// ─── Helpers — HTTP ───────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function apiFetch(method: string, path: string, body?: object, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

const apiPost  = (path: string, body: object, token?: string) => apiFetch('POST',  path, body, token);
const apiPatch = (path: string, body: object, token: string)  => apiFetch('PATCH', path, body, token);
const apiGet   = (path: string, token: string)                => apiFetch('GET',   path, undefined, token);
const apiDel   = (path: string, token: string)                => apiFetch('DELETE',path, undefined, token);

// ─── Helpers — WebSocket ──────────────────────────────────────────────────────

function makeSocket(token: string): Socket {
  return io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: false,
    reconnection: false,
  });
}

/**
 * Đợi socket event trong timeout ms.
 * Trái tim của bộ test — event phải đến qua WS, không cần HTTP poll / reload.
 */
function waitForEvent(socket: Socket, event: string, ms = 6000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout ${ms}ms — "${event}" không đến`)), ms);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}

function waitForConnect(socket: Socket, ms = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('WS connect timeout')), ms);
    if (socket.connected) { clearTimeout(t); return resolve(); }
    socket.once('connect',       () => { clearTimeout(t); resolve(); });
    socket.once('connect_error', (e) => { clearTimeout(t); reject(e); });
  });
}

function waitForDisconnect(socket: Socket, ms = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('WS disconnect timeout')), ms);
    socket.once('disconnect', (reason) => { clearTimeout(t); resolve(reason); });
  });
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

test.beforeAll(async () => {
  // 1. Đăng ký user A (throttle: 1 req/s cho register)
  const rA = await apiPost('/auth/register', { email: EMAIL_A, password: PASSWORD, fullName: 'PW User A' });
  if (!rA?.data?.id) throw new Error(`Register A failed: ${JSON.stringify(rA)}`);
  await delay(1200);

  // 2. Đăng ký user B
  const rB = await apiPost('/auth/register', { email: EMAIL_B, password: PASSWORD, fullName: 'PW User B' });
  if (!rB?.data?.id) throw new Error(`Register B failed: ${JSON.stringify(rB)}`);
  await delay(1200);

  // 3. Login user A
  const lA = await apiPost('/auth/login', { email: EMAIL_A, password: PASSWORD });
  if (!lA?.data?.accessToken) throw new Error(`Login A failed: ${JSON.stringify(lA)}`);
  tokenA = lA.data.accessToken;
  await delay(1200);

  // 4. Login user B
  const lB = await apiPost('/auth/login', { email: EMAIL_B, password: PASSWORD });
  if (!lB?.data?.accessToken) throw new Error(`Login B failed: ${JSON.stringify(lB)}`);
  tokenB = lB.data.accessToken;
  await delay(500);

  // 5. Lấy profile → user ID
  const pA = await apiGet('/users/me', tokenA);
  userAId = pA.data.id;
  const pB = await apiGet('/users/me', tokenB);
  userBId = pB.data.id;

  // 6. User A tạo project
  const proj = await apiPost('/projects', {
    name: `PW-${RUN_ID}`,
    key: `PW${String(RUN_ID).slice(-4)}`, // max 4 char key
    description: 'Playwright real-time test project',
  }, tokenA);
  if (!proj?.data?.id) throw new Error(`Create project failed: ${JSON.stringify(proj)}`);
  projectId = proj.data.id;

  // 7. User A invite User B vào project (để B có thể post comment)
  await delay(500);
  const inv = await apiPost(`/projects/${projectId}/members`, { email: EMAIL_B, role: 'MEMBER' }, tokenA);
  if (inv?.statusCode >= 400) throw new Error(`Invite B failed: ${JSON.stringify(inv)}`);

  // 8. User A tạo issue (A = reporter)
  await delay(500);
  const issue = await apiPost(`/projects/${projectId}/issues`, {
    title: 'PW Real-time Test Issue',
    type: 'TASK',
    priority: 'MEDIUM',
  }, tokenA);
  if (!issue?.data?.issueKey) throw new Error(`Create issue failed: ${JSON.stringify(issue)}`);
  issueKey = issue.data.issueKey; // e.g. "PW1234-1"
});

test.afterAll(async () => {
  // Xoá project → cascade xoá members + issues + comments
  if (projectId) await apiDel(`/projects/${projectId}`, tokenA);
});

// ─── Nhóm 1: Kết nối WebSocket ───────────────────────────────────────────────

test.describe('Kết nối WebSocket', () => {
  test('TC-WS-01: JWT hợp lệ → kết nối thành công, join room user:{id}', async () => {
    const socket = makeSocket(tokenA);
    socket.connect();

    await expect(waitForConnect(socket)).resolves.toBeUndefined();
    expect(socket.connected).toBe(true);

    socket.disconnect();
  });

  test('TC-WS-02: JWT không hợp lệ → server ngắt kết nối ngay', async () => {
    const socket = makeSocket('not.a.valid.token');
    socket.connect();

    const reason = await waitForDisconnect(socket, 5000);
    expect(socket.connected).toBe(false);
    expect(reason).toBeTruthy(); // 'io server disconnect' hoặc 'transport close'
  });
});

// ─── Nhóm 2: Thông báo real-time (không reload) ──────────────────────────────

test.describe('Thông báo real-time (không reload)', () => {
  test('TC-NOTIF-01: Reporter (A) nhận notification:new khi B đăng comment', async () => {
    /**
     * Flow production:
     *   B POST comment → comments.service → eventEmitter.emit('comment.added')
     *   → NotificationsListener.handleCommentAdded()
     *   → notificationsService.create() + gateway.emitNotification(issueReporterId)
     *   → A nhận 'notification:new' qua WS — KHÔNG cần reload
     */
    const socketA = makeSocket(tokenA);
    socketA.connect();
    await waitForConnect(socketA);

    // Đăng ký listener TRƯỚC — chứng minh push, không phải poll
    const notifPromise = waitForEvent(socketA, 'notification:new');

    // B comment → trigger event
    const c = await apiPost(`/projects/${projectId}/issues/${issueKey}/comments`, {
      content: `Real-time test comment ${RUN_ID}`,
    }, tokenB);
    expect(c?.data?.id).toBeTruthy(); // comment tạo thành công

    const notif = await notifPromise;

    expect(notif).toMatchObject({
      type: 'COMMENT_ADDED',
      userId: userAId,
    });

    socketA.disconnect();
  });

  test('TC-NOTIF-02: Reporter (A) nhận comment:new trong issue room khi B comment', async () => {
    /**
     * Flow: B POST comment → eventEmitter.emit('comment.added')
     *   → gateway.emitNewComment(issueKey, payload)
     *   → A (đã join issue room) nhận 'comment:new' — KHÔNG cần reload
     */
    const socketA = makeSocket(tokenA);
    socketA.connect();
    await waitForConnect(socketA);

    // A join issue room
    socketA.emit('joinIssue', { issueKey });
    await delay(300); // đợi server xử lý

    const commentNewPromise = waitForEvent(socketA, 'comment:new');

    const c = await apiPost(`/projects/${projectId}/issues/${issueKey}/comments`, {
      content: `Issue room comment ${Date.now()}`,
    }, tokenB);
    expect(c?.data?.id).toBeTruthy();

    const payload = await commentNewPromise;

    expect(payload).toMatchObject({
      content: expect.stringContaining('Issue room comment'),
      authorId: userBId,
    });

    socketA.disconnect();
  });

  test('TC-NOTIF-03: Tác giả (B) KHÔNG nhận notification:new về comment của chính mình', async () => {
    /**
     * issueReporterId (A) !== authorId (B) → A nhận notif
     * Nhưng B (author) không nhận notification về comment của mình
     */
    const socketB = makeSocket(tokenB);
    socketB.connect();
    await waitForConnect(socketB);

    let bGotCommentNotif = false;
    socketB.on('notification:new', (n) => {
      if (n.type === 'COMMENT_ADDED') bGotCommentNotif = true;
    });

    await apiPost(`/projects/${projectId}/issues/${issueKey}/comments`, {
      content: `Author self-test ${Date.now()}`,
    }, tokenB); // B comment

    await delay(2000); // đủ thời gian nếu server gửi nhầm
    expect(bGotCommentNotif).toBe(false);

    socketB.disconnect();
  });

  test('TC-NOTIF-04: Reporter (A) comment trên issue của mình → A KHÔNG nhận COMMENT_ADDED', async () => {
    /**
     * comments.service.ts: if (event.issueReporterId !== event.authorId) → tạo notification
     * Nếu A vừa là reporter vừa là tác giả → KHÔNG tạo notification
     */
    const socketA = makeSocket(tokenA);
    socketA.connect();
    await waitForConnect(socketA);

    let selfNotif = false;
    socketA.on('notification:new', (n) => {
      if (n.type === 'COMMENT_ADDED') selfNotif = true;
    });

    await apiPost(`/projects/${projectId}/issues/${issueKey}/comments`, {
      content: `Self comment ${Date.now()}`,
    }, tokenA); // A tự comment (A = reporter)

    await delay(2000);
    expect(selfNotif).toBe(false);

    socketA.disconnect();
  });

  test('TC-NOTIF-05: Unread count tăng sau khi nhận notification:new', async () => {
    // Lấy số unread TRƯỚC khi có comment mới
    const before = await apiGet('/notifications/unread-count', tokenA);
    const countBefore = before.data as number;

    const socketA = makeSocket(tokenA);
    socketA.connect();
    await waitForConnect(socketA);

    const notifPromise = waitForEvent(socketA, 'notification:new', 8000);

    await apiPost(`/projects/${projectId}/issues/${issueKey}/comments`, {
      content: `Unread count test ${Date.now()}`,
    }, tokenB);

    // Đợi WS push đến — không cần reload
    await notifPromise;

    // REST confirm unread count tăng
    const after = await apiGet('/notifications/unread-count', tokenA);
    expect(after.data).toBeGreaterThan(countBefore);

    socketA.disconnect();
  });
});

// ─── Nhóm 3: Isolation — bảo mật phòng WS ───────────────────────────────────

test.describe('Bảo mật phòng WebSocket', () => {
  test('TC-ISO-01: User B không nhận notification:new dành cho User A', async () => {
    /**
     * notification:new được emit vào room user:{A_id}
     * User B connect vào room user:{B_id} → không nhận được của A
     */
    const socketA = makeSocket(tokenA);
    const socketB = makeSocket(tokenB);
    socketA.connect();
    socketB.connect();
    await Promise.all([waitForConnect(socketA), waitForConnect(socketB)]);

    let bGotANotif = false;
    socketB.on('notification:new', () => { bGotANotif = true; });

    // A nhận notif khi B comment
    const aNotifPromise = waitForEvent(socketA, 'notification:new', 8000);
    await apiPost(`/projects/${projectId}/issues/${issueKey}/comments`, {
      content: `Isolation test comment ${Date.now()}`,
    }, tokenB);

    await aNotifPromise; // A nhận — confirmed

    await delay(1000); // đợi thêm để xem B có nhận không
    expect(bGotANotif).toBe(false); // B KHÔNG được nhận notif của A

    socketA.disconnect();
    socketB.disconnect();
  });

  test('TC-ISO-02: User không join issue room không nhận comment:new', async () => {
    /**
     * comment:new emit vào room issue:{issueKey}
     * User B connect nhưng KHÔNG join room đó → không nhận event
     */
    const socketB = makeSocket(tokenB);
    socketB.connect();
    await waitForConnect(socketB);
    // B không emit 'joinIssue' → không trong room issue:{issueKey}

    let bGotComment = false;
    socketB.on('comment:new', () => { bGotComment = true; });

    // A join room và nhận event
    const socketA = makeSocket(tokenA);
    socketA.connect();
    await waitForConnect(socketA);
    socketA.emit('joinIssue', { issueKey });
    await delay(300);

    const aCommentPromise = waitForEvent(socketA, 'comment:new', 8000);

    await apiPost(`/projects/${projectId}/issues/${issueKey}/comments`, {
      content: `Room isolation test ${Date.now()}`,
    }, tokenB);

    await aCommentPromise; // A nhận — confirmed (vì A join room)

    await delay(1000);
    expect(bGotComment).toBe(false); // B KHÔNG nhận vì không join room

    socketA.disconnect();
    socketB.disconnect();
  });
});
