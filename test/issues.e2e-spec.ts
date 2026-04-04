process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { createE2EApp } from './helpers/e2e-setup.helper';

const USER_ID = '00000000-0000-4000-a000-000000000001';
const PROJECT_ID = '00000000-0000-4000-a000-000000000010';
const MEMBER_ID = '00000000-0000-4000-a000-000000000030';

describe('Issues (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    ({ app, prisma } = await createE2EApp());
  });

  afterEach(async () => {
    await app.close();
  });

  async function loginAndGetToken(): Promise<string> {
    const hashedPassword = await bcrypt.hash('Password1!', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: 'test@example.com',
      password: hashedPassword,
      fullName: 'Test User',
      role: 'USER',
    });
    prisma.user.update.mockResolvedValue({});

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password1!' });

    return loginRes.body.data.accessToken;
  }

  const mockMembership = (role = 'OWNER') => {
    prisma.projectMember.findUnique.mockResolvedValue({
      id: MEMBER_ID,
      userId: USER_ID,
      projectId: PROJECT_ID,
      role,
    });
  };

  describe('POST /api/projects/:projectId/issues', () => {
    it('should create issue (201)', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.project.update.mockResolvedValue({ key: 'TRK', issueSequence: 1 });
      prisma.issue.create.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        title: 'Test issue',
        status: 'TODO',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/issues`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test issue' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('issueKey', 'TRK-1');
    });

    it('should return 400 for missing title', async () => {
      const token = await loginAndGetToken();
      mockMembership();

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/issues`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/issues`)
        .send({ title: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/projects/:projectId/issues', () => {
    it('should return paginated issues', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findMany.mockResolvedValue([]);
      prisma.issue.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}/issues`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should filter by status', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findMany.mockResolvedValue([]);
      prisma.issue.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}/issues?status=IN_PROGRESS`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/projects/:projectId/issues/board', () => {
    it('should return issues grouped by status columns', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}/issues/board`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH .../issues/:issueKey/status', () => {
    it('should change status', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findUnique.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        projectId: PROJECT_ID,
        status: 'TODO',
      });
      prisma.issue.update.mockResolvedValue({
        issueKey: 'TRK-1',
        status: 'IN_PROGRESS',
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/projects/${PROJECT_ID}/issues/TRK-1/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
    });
  });

  describe('Attachments', () => {
    it('should upload file attachment (201)', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findUnique.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        projectId: PROJECT_ID,
      });
      prisma.attachment.create.mockResolvedValue({
        id: 'att-1',
        filename: 'test.pdf',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/issues/TRK-1/attachments`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('content'), 'test.pdf');

      expect(res.status).toBe(201);
    });

    it('should list attachments', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findUnique.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        projectId: PROJECT_ID,
      });
      prisma.attachment.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}/issues/TRK-1/attachments`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should delete attachment (204)', async () => {
      const attachmentId = '00000000-0000-4000-a000-000000000099';
      const token = await loginAndGetToken();
      mockMembership();
      prisma.attachment.findUnique.mockResolvedValue({
        id: attachmentId,
        uploaderId: USER_ID,
        url: '/uploads/attachments/test.pdf',
      });
      prisma.attachment.delete.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .delete(`/api/projects/${PROJECT_ID}/issues/TRK-1/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });
  });
});
