/**
 * Integration Tests — Notification Creation
 *
 * Mục tiêu: Xác minh rằng các action thực tế (assign issue, invite member,
 * comment) tạo ra notification trong DB và trả về đúng qua REST API.
 *
 * Không dùng mock — kết nối real DB thông qua server đang chạy.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const API = `${BASE_URL}/api`;

const RUN_ID  = Date.now();
const EMAIL_A = `notif_a_${RUN_ID}@test.local`;
const EMAIL_B = `notif_b_${RUN_ID}@test.local`;
const PASSWORD = 'Password1!';

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
  const json = await res.json();
  return { status: res.status, body: json };
}

const apiPost  = (path: string, body: object, token?: string) => apiFetch('POST',  path, body, token);
const apiPatch = (path: string, body: object, token: string)  => apiFetch('PATCH', path, body, token);
const apiGet   = (path: string, token: string)                => apiFetch('GET',   path, undefined, token);
const apiDel   = (path: string, token: string)                => apiFetch('DELETE',path, undefined, token);

// ─── Shared state — module-level to survive multiple beforeAll calls ──────────

/** Guard so the real setup only runs once even if beforeAll fires multiple times */
let setupDone = false;

let tokenA = '';
let tokenB = '';
let userAId = '';
let userBId = '';
let projectId = '';
let issueKey = '';

// ─── Helper: lấy notifications của user ──────────────────────────────────────

async function getNotifications(token: string) {
  const res = await apiGet('/notifications?limit=50', token);
  return (res.body.data?.data ?? []) as Array<{
    id: string;
    type: string;
    userId: string;
    isRead: boolean;
    title: string;
    message: string;
  }>;
}

async function getUnreadCount(token: string): Promise<number> {
  const res = await apiGet('/notifications/unread-count', token);
  return res.body.data as number;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  if (setupDone) return; // Playwright may call beforeAll multiple times — guard it

  // Wait for throttler to reset after previous test file's registrations
  await delay(5000);

  // Register User A
  let rA = await apiPost('/auth/register', { email: EMAIL_A, password: PASSWORD, fullName: 'Notif User A' });
  if (rA.status === 429) { await delay(3000); rA = await apiPost('/auth/register', { email: EMAIL_A, password: PASSWORD, fullName: 'Notif User A' }); }
  if (!rA.body?.data?.id) throw new Error(`Register A failed: ${JSON.stringify(rA.body)}`);
  await delay(2000);

  // Register User B
  let rB = await apiPost('/auth/register', { email: EMAIL_B, password: PASSWORD, fullName: 'Notif User B' });
  if (rB.status === 429) { await delay(3000); rB = await apiPost('/auth/register', { email: EMAIL_B, password: PASSWORD, fullName: 'Notif User B' }); }
  if (!rB.body?.data?.id) throw new Error(`Register B failed: ${JSON.stringify(rB.body)}`);
  await delay(2000);

  // Login A
  const lA = await apiPost('/auth/login', { email: EMAIL_A, password: PASSWORD });
  tokenA = lA.body.data.accessToken;
  await delay(1000);

  // Login B
  const lB = await apiPost('/auth/login', { email: EMAIL_B, password: PASSWORD });
  tokenB = lB.body.data.accessToken;

  // Fetch profiles
  const pA = await apiGet('/users/me', tokenA);
  userAId = pA.body.data.id;
  const pB = await apiGet('/users/me', tokenB);
  userBId = pB.body.data.id;

  // A creates project
  const proj = await apiPost('/projects', {
    name: `NotifTest-${RUN_ID}`,
    key: `NT${String(RUN_ID).slice(-4)}`,
    description: 'Notification creation integration test',
  }, tokenA);
  if (!proj.body?.data?.id) throw new Error(`Create project failed: ${JSON.stringify(proj.body)}`);
  projectId = proj.body.data.id;

  // A creates issue (A = reporter)
  const issue = await apiPost(`/projects/${projectId}/issues`, {
    title: 'Notification Test Issue',
    type: 'TASK',
    priority: 'MEDIUM',
  }, tokenA);
  if (!issue.body?.data?.issueKey) throw new Error(`Create issue failed: ${JSON.stringify(issue.body)}`);
  issueKey = issue.body.data.issueKey;

  setupDone = true;
});

test.afterAll(async () => {
  if (projectId) await apiDel(`/projects/${projectId}`, tokenA);
  setupDone = false;
});

// ─── TC-CREATE-01: member.invited ─────────────────────────────────────────────

test('TC-CREATE-01: Invite member → tạo MEMBER_INVITED notification cho user được mời', async () => {
  const countBefore = await getUnreadCount(tokenB);

  // A invites B by email
  const inv = await apiPost(`/projects/${projectId}/members`, { email: EMAIL_B, role: 'MEMBER' }, tokenA);
  console.log('[TC-01] invite response:', inv.status, JSON.stringify(inv.body));
  expect(inv.status).toBe(201);

  await delay(1500); // đợi event listener xử lý async

  // B kiểm tra notifications
  const allNotifs = await getNotifications(tokenB);
  console.log('[TC-01] B notifications:', JSON.stringify(allNotifs));

  const memberNotif = allNotifs.find((n) => n.type === 'MEMBER_INVITED');

  expect(memberNotif).toBeDefined();
  expect(memberNotif?.userId).toBe(userBId);
  expect(memberNotif?.isRead).toBe(false);

  const countAfter = await getUnreadCount(tokenB);
  expect(countAfter).toBeGreaterThan(countBefore);
});

// ─── TC-CREATE-02: issue.assigned ─────────────────────────────────────────────

test('TC-CREATE-02: Assign issue → tạo ISSUE_ASSIGNED notification cho assignee', async () => {
  // B is already a member (added in TC-CREATE-01)
  const countBefore = await getUnreadCount(tokenB);

  // A assigns issue to B
  const upd = await apiPatch(
    `/projects/${projectId}/issues/${issueKey}`,
    { assigneeId: userBId },
    tokenA,
  );
  console.log('[TC-02] assign response:', upd.status, JSON.stringify(upd.body));
  expect(upd.status).toBe(200);

  await delay(500);

  const notifs = await getNotifications(tokenB);
  const assignNotif = notifs.find((n) => n.type === 'ISSUE_ASSIGNED');

  expect(assignNotif).toBeDefined();
  expect(assignNotif?.userId).toBe(userBId);
  expect(assignNotif?.isRead).toBe(false);

  const countAfter = await getUnreadCount(tokenB);
  expect(countAfter).toBeGreaterThan(countBefore);
});

// ─── TC-CREATE-03: comment.added ──────────────────────────────────────────────

test('TC-CREATE-03: B comment → tạo COMMENT_ADDED notification cho reporter (A)', async () => {
  const countBefore = await getUnreadCount(tokenA);

  // B posts a comment on the issue (A = reporter)
  const c = await apiPost(
    `/projects/${projectId}/issues/${issueKey}/comments`,
    { content: `Integration test comment ${RUN_ID}` },
    tokenB,
  );
  expect(c.status).toBe(201);
  expect(c.body.data?.id).toBeTruthy();

  await delay(500);

  const notifs = await getNotifications(tokenA);
  const commentNotif = notifs.find((n) => n.type === 'COMMENT_ADDED');

  expect(commentNotif).toBeDefined();
  expect(commentNotif?.userId).toBe(userAId);
  expect(commentNotif?.isRead).toBe(false);

  const countAfter = await getUnreadCount(tokenA);
  expect(countAfter).toBeGreaterThan(countBefore);
});

// ─── TC-CREATE-04: A comment trên issue của mình → KHÔNG tạo notification ─────

test('TC-CREATE-04: Reporter tự comment → KHÔNG tạo COMMENT_ADDED notification', async () => {
  const notifsBefore = await getNotifications(tokenA);
  const commentNotifsBefore = notifsBefore.filter((n) => n.type === 'COMMENT_ADDED').length;

  // A self-comments (A = reporter = author)
  const c = await apiPost(
    `/projects/${projectId}/issues/${issueKey}/comments`,
    { content: `Self comment ${Date.now()}` },
    tokenA,
  );
  expect(c.status).toBe(201);

  await delay(500);

  const notifsAfter = await getNotifications(tokenA);
  const commentNotifsAfter = notifsAfter.filter((n) => n.type === 'COMMENT_ADDED').length;

  // Số lượng COMMENT_ADDED không tăng
  expect(commentNotifsAfter).toBe(commentNotifsBefore);
});

// ─── TC-CREATE-05: issue.status.changed → KHÔNG tạo notification người dùng ──

test('TC-CREATE-05: Đổi status issue → KHÔNG tạo notification (chỉ emit board:update)', async () => {
  const notifsBefore = await getNotifications(tokenA);
  const totalBefore = notifsBefore.length;

  const res = await apiPatch(
    `/projects/${projectId}/issues/${issueKey}/status`,
    { status: 'IN_PROGRESS' },
    tokenA,
  );
  expect(res.status).toBe(200);

  await delay(500);

  const notifsAfter = await getNotifications(tokenA);
  // Không tạo thêm notification nào khi đổi status
  expect(notifsAfter.length).toBe(totalBefore);
});

// ─── TC-CREATE-06: mark as read ───────────────────────────────────────────────

test('TC-CREATE-06: Mark notification as read → isRead = true, unread count giảm', async () => {
  const notifs = await getNotifications(tokenB);
  const unread = notifs.find((n) => !n.isRead);
  expect(unread).toBeDefined();

  const countBefore = await getUnreadCount(tokenB);

  const res = await apiPatch(`/notifications/${unread!.id}/read`, {}, tokenB);
  expect(res.status).toBe(200);
  expect(res.body.data.isRead).toBe(true);

  const countAfter = await getUnreadCount(tokenB);
  expect(countAfter).toBe(countBefore - 1);
});

// ─── TC-CREATE-07: mark all as read ───────────────────────────────────────────

test('TC-CREATE-07: Mark all as read → unread count = 0', async () => {
  const res = await apiPatch('/notifications/read-all', {}, tokenB);
  expect(res.status).toBe(200);

  const count = await getUnreadCount(tokenB);
  expect(count).toBe(0);
});
