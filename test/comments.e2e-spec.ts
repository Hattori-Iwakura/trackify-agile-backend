process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { createE2EApp } from './helpers/e2e-setup.helper';

const USER_ID = '00000000-0000-4000-a000-000000000001';
const PROJECT_ID = '00000000-0000-4000-a000-000000000010';
const COMMENT_ID = '00000000-0000-4000-a000-000000000060';
const MEMBER_ID = '00000000-0000-4000-a000-000000000030';

describe('Comments (e2e)', () => {
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

  describe('POST .../issues/:issueKey/comments', () => {
    it('should create comment (201)', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findUnique.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        projectId: PROJECT_ID,
        reporterId: 'reporter-1',
      });
      prisma.comment.create.mockResolvedValue({
        id: COMMENT_ID,
        content: 'Looks good!',
        authorId: USER_ID,
      });

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/issues/TRK-1/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Looks good!' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('content', 'Looks good!');
    });

    it('should create reply with parentId (201)', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findUnique.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        projectId: PROJECT_ID,
        reporterId: 'reporter-1',
      });
      prisma.comment.findUnique.mockResolvedValue({ id: '00000000-0000-4000-a000-000000000070', issueId: 'issue-1' });
      prisma.comment.create.mockResolvedValue({
        id: COMMENT_ID,
        content: 'Thanks!',
        parentId: '00000000-0000-4000-a000-000000000070',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/issues/TRK-1/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Thanks!', parentId: '00000000-0000-4000-a000-000000000070' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('parentId', '00000000-0000-4000-a000-000000000070');
    });

    it('should return 400 for empty content', async () => {
      const token = await loginAndGetToken();
      mockMembership();

      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/issues/TRK-1/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/issues/TRK-1/comments`)
        .send({ content: 'Test' })
        .expect(401);
    });
  });

  describe('GET .../issues/:issueKey/comments', () => {
    it('should return threaded comments', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findUnique.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        projectId: PROJECT_ID,
        reporterId: 'reporter-1',
      });
      prisma.comment.findMany.mockResolvedValue([
        { id: 'comment-1', content: 'Root', replies: [] },
      ]);

      return request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}/issues/TRK-1/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('PATCH .../comments/:commentId', () => {
    it('should update comment (200)', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.comment.findUnique.mockResolvedValue({
        id: COMMENT_ID,
        authorId: USER_ID,
        issue: { issueKey: 'TRK-1' },
      });
      prisma.comment.update.mockResolvedValue({
        id: COMMENT_ID,
        content: 'Updated',
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/projects/${PROJECT_ID}/issues/TRK-1/comments/${COMMENT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('content', 'Updated');
    });

    it('should return 403 if not the author', async () => {
      const token = await loginAndGetToken();
      mockMembership('MEMBER');
      prisma.comment.findUnique.mockResolvedValue({
        id: COMMENT_ID,
        authorId: 'other-user',
        issue: { issueKey: 'TRK-1' },
      });

      return request(app.getHttpServer())
        .patch(`/api/projects/${PROJECT_ID}/issues/TRK-1/comments/${COMMENT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE .../comments/:commentId', () => {
    it('should delete comment (200)', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.comment.findUnique.mockResolvedValue({
        id: COMMENT_ID,
        authorId: USER_ID,
        issue: { issueKey: 'TRK-1' },
      });
      prisma.comment.delete.mockResolvedValue({});

      return request(app.getHttpServer())
        .delete(`/api/projects/${PROJECT_ID}/issues/TRK-1/comments/${COMMENT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
