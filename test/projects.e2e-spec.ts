process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { createE2EApp } from './helpers/e2e-setup.helper';

// Valid UUIDs for test params (ParseUUIDPipe requires valid UUIDs)
const USER_ID = '00000000-0000-4000-a000-000000000001';
const PROJECT_ID = '00000000-0000-4000-a000-000000000010';
const TARGET_USER_ID = '00000000-0000-4000-a000-000000000002';
const LABEL_ID = '00000000-0000-4000-a000-000000000020';
const MEMBER_ID = '00000000-0000-4000-a000-000000000030';

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

  // Helper: mock the guard's membership check
  const mockMembership = (role = 'OWNER') => {
    prisma.projectMember.findUnique.mockResolvedValue({
      id: MEMBER_ID,
      userId: USER_ID,
      projectId: PROJECT_ID,
      role,
    });
  };

  describe('POST /api/projects', () => {
    it('should create project and return project data (201)', async () => {
      const token = await loginAndGetToken();

      prisma.project.findUnique.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue({
        id: PROJECT_ID,
        name: 'Test Project',
        key: 'TP',
        description: null,
        createdAt: new Date().toISOString(),
      });
      prisma.projectMember.create.mockResolvedValue({
        id: MEMBER_ID,
        userId: USER_ID,
        projectId: PROJECT_ID,
        role: 'OWNER',
      });

      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Project', key: 'TP' })
        .expect(201)
        .expect((res) => {
          expect(res.body.statusCode).toBe(201);
          expect(res.body.data).toHaveProperty('id', PROJECT_ID);
          expect(res.body.data).toHaveProperty('name', 'Test Project');
          expect(res.body.data).toHaveProperty('key', 'TP');
          expect(res.body.data).toHaveProperty('members');
          expect(res.body.data.members).toHaveLength(1);
          expect(res.body.data.members[0]).toHaveProperty('role', 'OWNER');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('should return 400 with validation message for missing name', async () => {
      const token = await loginAndGetToken();

      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ key: 'TP' })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toBeDefined();
          expect(res.body).toHaveProperty('path');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('should return 400 for missing key', async () => {
      const token = await loginAndGetToken();

      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Project' })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/projects')
        .send({ name: 'Test', key: 'TP' })
        .expect(401)
        .expect((res) => {
          expect(res.body.statusCode).toBe(401);
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return 409 with errorCode for duplicate key', async () => {
      const token = await loginAndGetToken();

      prisma.project.create.mockRejectedValue(
        Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
      );

      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', key: 'TP' })
        .expect(409)
        .expect((res) => {
          expect(res.body.statusCode).toBe(409);
          expect(res.body.message).toContain('TP');
          expect(res.body.errorCode).toBe('PROJECT_KEY_EXISTS');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('GET /api/projects', () => {
    it('should return paginated list with meta', async () => {
      const token = await loginAndGetToken();

      const projects = [
        { id: PROJECT_ID, name: 'Project A', key: 'PA', _count: { members: 2 } },
        { id: '00000000-0000-4000-a000-000000000011', name: 'Project B', key: 'PB', _count: { members: 1 } },
      ];
      prisma.project.findMany.mockResolvedValue(projects);
      prisma.project.count.mockResolvedValue(2);

      return request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('meta');
          expect(res.body.data.data).toHaveLength(2);
          expect(res.body.data.meta).toEqual(
            expect.objectContaining({
              total: 2,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
          );
        });
    });

    it('should return empty list when user has no projects', async () => {
      const token = await loginAndGetToken();

      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      return request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.data).toEqual([]);
          expect(res.body.data.meta.total).toBe(0);
          expect(res.body.data.meta.totalPages).toBe(0);
        });
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/projects')
        .expect(401)
        .expect((res) => {
          expect(res.body.statusCode).toBe(401);
        });
    });
  });

  describe('GET /api/projects/:projectId', () => {
    it('should return project details with counts', async () => {
      const token = await loginAndGetToken();
      mockMembership();

      prisma.project.findUnique.mockResolvedValue({
        id: PROJECT_ID,
        name: 'Test',
        key: 'TP',
        description: 'A test project',
        _count: { members: 3, labels: 5 },
      });

      return request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('id', PROJECT_ID);
          expect(res.body.data).toHaveProperty('name', 'Test');
          expect(res.body.data).toHaveProperty('key', 'TP');
          expect(res.body.data._count).toEqual({ members: 3, labels: 5 });
        });
    });

    it('should return 404 with errorCode for unknown project', async () => {
      const token = await loginAndGetToken();
      mockMembership();

      // Guard passes (mock returns membership), service throws 404
      prisma.project.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.message).toBe('Project not found');
          expect(res.body.errorCode).toBe('PROJECT_NOT_FOUND');
          expect(res.body).toHaveProperty('path');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.statusCode).toBe(401);
        });
    });
  });

  describe('PATCH /api/projects/:projectId', () => {
    it('should update project name (OWNER)', async () => {
      const token = await loginAndGetToken();
      mockMembership('OWNER');

      prisma.project.findUnique.mockResolvedValue({
        id: PROJECT_ID,
        name: 'Old Name',
        key: 'TP',
      });
      prisma.project.update.mockResolvedValue({
        id: PROJECT_ID,
        name: 'Updated Name',
        key: 'TP',
      });

      return request(app.getHttpServer())
        .patch(`/api/projects/${PROJECT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('name', 'Updated Name');
          expect(res.body.data).toHaveProperty('id', PROJECT_ID);
        });
    });

    it('should return 403 for non-OWNER role', async () => {
      const token = await loginAndGetToken();
      mockMembership('MEMBER');

      return request(app.getHttpServer())
        .patch(`/api/projects/${PROJECT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })
        .expect(403)
        .expect((res) => {
          expect(res.body.statusCode).toBe(403);
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return 404 when project does not exist', async () => {
      const token = await loginAndGetToken();
      mockMembership('OWNER');

      prisma.project.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .patch(`/api/projects/${PROJECT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.errorCode).toBe('PROJECT_NOT_FOUND');
        });
    });
  });

  describe('DELETE /api/projects/:projectId', () => {
    it('should delete project (OWNER)', async () => {
      const token = await loginAndGetToken();
      mockMembership('OWNER');

      prisma.project.findUnique.mockResolvedValue({
        id: PROJECT_ID,
        name: 'Test',
        key: 'TP',
      });
      prisma.project.delete.mockResolvedValue({
        id: PROJECT_ID,
        name: 'Test',
        key: 'TP',
      });

      return request(app.getHttpServer())
        .delete(`/api/projects/${PROJECT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('id', PROJECT_ID);
        });
    });

    it('should return 403 for non-OWNER role', async () => {
      const token = await loginAndGetToken();
      mockMembership('ADMIN');

      return request(app.getHttpServer())
        .delete(`/api/projects/${PROJECT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.statusCode).toBe(403);
        });
    });

    it('should return 404 when project does not exist', async () => {
      const token = await loginAndGetToken();
      mockMembership('OWNER');

      prisma.project.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .delete(`/api/projects/${PROJECT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.errorCode).toBe('PROJECT_NOT_FOUND');
        });
    });
  });

  describe('Members', () => {
    it('should add member and return member data (201)', async () => {
      const token = await loginAndGetToken();

      prisma.user.findUnique.mockResolvedValue({ id: TARGET_USER_ID });
      prisma.projectMember.findUnique
        .mockResolvedValueOnce({ id: MEMBER_ID, userId: USER_ID, role: 'OWNER' }) // guard
        .mockResolvedValueOnce(null); // not already member
      prisma.projectMember.create.mockResolvedValue({
        userId: TARGET_USER_ID,
        projectId: PROJECT_ID,
        role: 'MEMBER',
      });

      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: TARGET_USER_ID, role: 'MEMBER' })
        .expect(201)
        .expect((res) => {
          expect(res.body.statusCode).toBe(201);
          expect(res.body.data).toHaveProperty('userId', TARGET_USER_ID);
          expect(res.body.data).toHaveProperty('role', 'MEMBER');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('should return 409 when user is already a member', async () => {
      const token = await loginAndGetToken();

      prisma.user.findUnique.mockResolvedValue({ id: TARGET_USER_ID });
      prisma.projectMember.findUnique
        .mockResolvedValueOnce({ id: MEMBER_ID, userId: USER_ID, role: 'OWNER' }) // guard
        .mockResolvedValueOnce({ userId: TARGET_USER_ID, role: 'MEMBER' }); // already member

      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: TARGET_USER_ID, role: 'MEMBER' })
        .expect(409)
        .expect((res) => {
          expect(res.body.statusCode).toBe(409);
          expect(res.body.errorCode).toBe('PROJECT_MEMBER_EXISTS');
          expect(res.body.message).toContain('already a member');
        });
    });

    it('should return 404 when target user does not exist', async () => {
      const token = await loginAndGetToken();

      prisma.projectMember.findUnique.mockResolvedValue({
        id: MEMBER_ID,
        userId: USER_ID,
        role: 'OWNER',
      }); // guard
      // First call: JwtStrategy resolves the authenticated user; second call: service lookup returns null
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: USER_ID, email: 'test@example.com', role: 'USER' })
        .mockResolvedValueOnce(null);

      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: TARGET_USER_ID, role: 'MEMBER' })
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.errorCode).toBe('USER_NOT_FOUND');
        });
    });

    it('should list members with pagination', async () => {
      const token = await loginAndGetToken();
      mockMembership();

      prisma.projectMember.findMany.mockResolvedValue([
        {
          userId: USER_ID,
          role: 'OWNER',
          user: { id: USER_ID, fullName: 'Test User', email: 'test@example.com', avatarUrl: null },
        },
      ]);
      prisma.projectMember.count.mockResolvedValue(1);

      return request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}/members`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('meta');
          expect(res.body.data.data).toHaveLength(1);
          expect(res.body.data.data[0]).toHaveProperty('role', 'OWNER');
          expect(res.body.data.data[0].user).toHaveProperty('fullName', 'Test User');
          expect(res.body.data.meta.total).toBe(1);
        });
    });

    it('should remove member and return 200', async () => {
      const token = await loginAndGetToken();

      prisma.projectMember.findUnique
        .mockResolvedValueOnce({ id: MEMBER_ID, userId: USER_ID, role: 'OWNER' }) // guard
        .mockResolvedValueOnce({ userId: TARGET_USER_ID, role: 'MEMBER' }); // target member
      prisma.projectMember.delete.mockResolvedValue({
        userId: TARGET_USER_ID,
        projectId: PROJECT_ID,
        role: 'MEMBER',
      });

      return request(app.getHttpServer())
        .delete(`/api/projects/${PROJECT_ID}/members/${TARGET_USER_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('userId', TARGET_USER_ID);
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('should return 404 when removing non-existent member', async () => {
      const token = await loginAndGetToken();

      prisma.projectMember.findUnique
        .mockResolvedValueOnce({ id: MEMBER_ID, userId: USER_ID, role: 'OWNER' }) // guard
        .mockResolvedValueOnce(null); // target not found

      return request(app.getHttpServer())
        .delete(`/api/projects/${PROJECT_ID}/members/${TARGET_USER_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.errorCode).toBe('PROJECT_MEMBER_NOT_FOUND');
        });
    });
  });

  describe('Labels', () => {
    it('should create label and return label data (201)', async () => {
      const token = await loginAndGetToken();

      prisma.projectMember.findUnique.mockResolvedValue({
        id: MEMBER_ID,
        userId: USER_ID,
        role: 'MEMBER',
      });
      prisma.label.findFirst.mockResolvedValue(null);
      prisma.label.create.mockResolvedValue({
        id: LABEL_ID,
        name: 'bug',
        color: '#ff0000',
        projectId: PROJECT_ID,
      });

      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/labels`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'bug', color: '#ff0000' })
        .expect(201)
        .expect((res) => {
          expect(res.body.statusCode).toBe(201);
          expect(res.body.data).toHaveProperty('id', LABEL_ID);
          expect(res.body.data).toHaveProperty('name', 'bug');
          expect(res.body.data).toHaveProperty('color', '#ff0000');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('should return 409 for duplicate label name', async () => {
      const token = await loginAndGetToken();

      prisma.projectMember.findUnique.mockResolvedValue({
        id: MEMBER_ID,
        userId: USER_ID,
        role: 'MEMBER',
      });
      prisma.label.create.mockRejectedValue(
        Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
      );

      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/labels`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'bug', color: '#ff0000' })
        .expect(409)
        .expect((res) => {
          expect(res.body.statusCode).toBe(409);
          expect(res.body.errorCode).toBe('PROJECT_LABEL_EXISTS');
          expect(res.body.message).toContain('bug');
        });
    });

    it('should list labels with pagination', async () => {
      const token = await loginAndGetToken();
      mockMembership();

      prisma.label.findMany.mockResolvedValue([
        { id: LABEL_ID, name: 'bug', color: '#ff0000' },
        { id: '00000000-0000-4000-a000-000000000021', name: 'feature', color: '#00ff00' },
      ]);
      prisma.label.count.mockResolvedValue(2);

      return request(app.getHttpServer())
        .get(`/api/projects/${PROJECT_ID}/labels`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('meta');
          expect(res.body.data.data).toHaveLength(2);
          expect(res.body.data.data[0]).toHaveProperty('name', 'bug');
          expect(res.body.data.data[1]).toHaveProperty('name', 'feature');
          expect(res.body.data.meta.total).toBe(2);
          expect(res.body.data.meta.totalPages).toBe(1);
        });
    });

    it('should return 403 for VIEWER creating a label', async () => {
      const token = await loginAndGetToken();

      prisma.projectMember.findUnique.mockResolvedValue({
        id: MEMBER_ID,
        userId: USER_ID,
        role: 'VIEWER',
      });

      return request(app.getHttpServer())
        .post(`/api/projects/${PROJECT_ID}/labels`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'bug', color: '#ff0000' })
        .expect(403)
        .expect((res) => {
          expect(res.body.statusCode).toBe(403);
        });
    });
  });
});
