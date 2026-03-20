process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { createE2EApp } from './helpers/e2e-setup.helper';

describe('Projects (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    ({ app, prisma } = await createE2EApp());
  });

  afterEach(async () => {
    await app.close();
  });

  // Helper: login and return accessToken
  async function loginAndGetToken(): Promise<string> {
    const hashedPassword = await bcrypt.hash('Password1!', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 'uuid-1',
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

  // Helper: mock the guard's membership check
  const mockMembership = (role = 'OWNER') => {
    prisma.projectMember.findUnique.mockResolvedValue({
      id: 'pm-1',
      userId: 'uuid-1',
      projectId: 'proj-1',
      role,
    });
  };

  describe('POST /api/projects', () => {
    it('should create project (201)', async () => {
      const token = await loginAndGetToken();

      prisma.project.findUnique.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        key: 'TP',
      });
      prisma.projectMember.create.mockResolvedValue({
        id: 'pm-1',
        userId: 'uuid-1',
        projectId: 'proj-1',
        role: 'OWNER',
      });

      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Project', key: 'TP' })
        .expect(201);
    });

    it('should return 400 for missing name', async () => {
      const token = await loginAndGetToken();

      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ key: 'TP' })
        .expect(400);
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/projects')
        .send({ name: 'Test', key: 'TP' })
        .expect(401);
    });

    it('should return 409 for duplicate key', async () => {
      const token = await loginAndGetToken();

      prisma.project.findUnique.mockResolvedValue({ id: 'existing' });

      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', key: 'TP' })
        .expect(409);
    });
  });

  describe('GET /api/projects', () => {
    it('should return paginated list', async () => {
      const token = await loginAndGetToken();

      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      return request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('GET /api/projects/:projectId', () => {
    it('should return project details', async () => {
      const token = await loginAndGetToken();
      mockMembership();

      prisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test',
        _count: { members: 1, labels: 0 },
      });

      return request(app.getHttpServer())
        .get('/api/projects/proj-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should return 404 for unknown id', async () => {
      const token = await loginAndGetToken();
      mockMembership();

      // Guard passes (mock returns membership for any projectId), service throws 404
      prisma.project.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/api/projects/unknown')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('Members', () => {
    it('should add member', async () => {
      const token = await loginAndGetToken();

      const targetUserId = '550e8400-e29b-41d4-a716-446655440000';
      prisma.user.findUnique.mockResolvedValue({ id: targetUserId });
      prisma.projectMember.findUnique
        .mockResolvedValueOnce({ id: 'pm-1', userId: 'uuid-1', role: 'OWNER' }) // guard
        .mockResolvedValueOnce(null); // not already member
      prisma.projectMember.create.mockResolvedValue({
        userId: targetUserId,
        role: 'MEMBER',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/members')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: targetUserId, role: 'MEMBER' })
        .expect(201);
    });

    it('should remove member', async () => {
      const token = await loginAndGetToken();

      prisma.projectMember.findUnique
        .mockResolvedValueOnce({ id: 'pm-1', userId: 'uuid-1', role: 'OWNER' }) // guard
        .mockResolvedValueOnce({ userId: 'uuid-2', role: 'MEMBER' }); // target member
      prisma.projectMember.delete.mockResolvedValue({});

      return request(app.getHttpServer())
        .delete('/api/projects/proj-1/members/uuid-2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Labels', () => {
    it('should create label for project', async () => {
      const token = await loginAndGetToken();

      prisma.projectMember.findUnique.mockResolvedValue({
        id: 'pm-1',
        userId: 'uuid-1',
        role: 'MEMBER',
      });
      prisma.label.findFirst.mockResolvedValue(null);
      prisma.label.create.mockResolvedValue({
        id: 'label-1',
        name: 'bug',
        color: '#ff0000',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/labels')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'bug', color: '#ff0000' })
        .expect(201);
    });

    it('should list labels', async () => {
      const token = await loginAndGetToken();
      mockMembership();

      prisma.label.findMany.mockResolvedValue([]);
      prisma.label.count.mockResolvedValue(0);

      return request(app.getHttpServer())
        .get('/api/projects/proj-1/labels')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
