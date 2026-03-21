process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { createE2EApp } from './helpers/e2e-setup.helper';

const USER_ID = '00000000-0000-4000-a000-000000000001';
const PROJECT_ID = '00000000-0000-4000-a000-000000000010';
const SPRINT_ID = '00000000-0000-4000-a000-000000000050';
const MEMBER_ID = '00000000-0000-4000-a000-000000000030';

describe('Sprints (e2e)', () => {
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

  describe('POST /api/projects/:projectId/sprints', () => {
    it('should create sprint (201)', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.sprint.create.mockResolvedValue({
        id: SPRINT_ID,
        name: 'Sprint 1',
        status: 'PLANNING',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sprint 1', startDate: '2026-03-15', endDate: '2026-03-29' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('name', 'Sprint 1');
    });

    it('should return 400 for missing name', async () => {
      const token = await loginAndGetToken();
      mockMembership();

      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/sprints`)
        .send({ name: 'Sprint 1' })
        .expect(401);
    });
  });

  describe('GET /api/projects/:projectId/sprints', () => {
    it('should return all sprints for project', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.sprint.findMany.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('POST .../sprints/:sprintId/start', () => {
    it('should start sprint (200)', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.sprint.findUnique.mockResolvedValue({
        id: SPRINT_ID,
        status: 'PLANNING',
        projectId: PROJECT_ID,
        startDate: new Date('2026-03-15'),
        endDate: new Date('2026-03-29'),
      });
      prisma.sprint.findFirst.mockResolvedValue(null);
      prisma.sprint.update.mockResolvedValue({
        id: SPRINT_ID,
        status: 'ACTIVE',
      });
      prisma.projectMember.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/sprints/${SPRINT_ID}/start`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('status', 'ACTIVE');
    });

    it('should return 400 for invalid transition', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.sprint.findUnique.mockResolvedValue({
        id: SPRINT_ID,
        status: 'COMPLETED',
        projectId: PROJECT_ID,
      });

      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/sprints/${SPRINT_ID}/start`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('POST .../sprints/:sprintId/complete', () => {
    it('should complete sprint (200)', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.sprint.findUnique.mockResolvedValue({
        id: SPRINT_ID,
        status: 'ACTIVE',
        projectId: PROJECT_ID,
      });
      prisma.sprint.update.mockResolvedValue({
        id: SPRINT_ID,
        status: 'COMPLETED',
      });
      prisma.projectMember.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/sprints/${SPRINT_ID}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('status', 'COMPLETED');
    });
  });

  describe('GET /api/projects/:projectId/backlog', () => {
    it('should return unassigned issues', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findMany.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}/backlog`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Sprint issue management', () => {
    it('should add issue to sprint (200)', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        sprintId: SPRINT_ID,
      });

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/sprints/${SPRINT_ID}/issues/PROJ-1`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('sprintId', SPRINT_ID);
    });

    it('should remove issue from sprint (200)', async () => {
      const token = await loginAndGetToken();
      mockMembership();
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        sprintId: null,
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/projects/${PROJECT_ID}/sprints/${SPRINT_ID}/issues/PROJ-1`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('sprintId', null);
    });
  });
});
