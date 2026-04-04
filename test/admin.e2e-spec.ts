process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { createE2EApp } from './helpers/e2e-setup.helper';

const ADMIN_ID = '00000000-0000-4000-a000-000000000001';
const TARGET_USER_ID = '00000000-0000-4000-a000-000000000002';

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    ({ app, prisma } = await createE2EApp());
  });

  afterEach(async () => {
    await app.close();
  });

  async function loginAsAdmin(): Promise<string> {
    const hashedPassword = await bcrypt.hash('Password1!', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      email: 'admin@example.com',
      password: hashedPassword,
      fullName: 'Admin User',
      role: 'ADMIN',
    });
    prisma.user.update.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Password1!' });

    return res.body.data.accessToken;
  }

  async function loginAsRegularUser(): Promise<string> {
    const hashedPassword = await bcrypt.hash('Password1!', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: TARGET_USER_ID,
      email: 'user@example.com',
      password: hashedPassword,
      fullName: 'Regular User',
      role: 'USER',
    });
    prisma.user.update.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Password1!' });

    return res.body.data.accessToken;
  }

  describe('GET /api/admin/users', () => {
    it('should return paginated users for admin (200)', async () => {
      const token = await loginAsAdmin();
      // JWT strategy validate
      prisma.user.findUnique.mockResolvedValue({ id: ADMIN_ID, email: 'admin@example.com', role: 'ADMIN' });
      prisma.user.findMany.mockResolvedValue([
        { id: ADMIN_ID, email: 'admin@example.com', fullName: 'Admin', role: 'ADMIN' },
      ]);
      prisma.user.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should return 403 for non-admin user', async () => {
      const token = await loginAsRegularUser();

      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return system stats for admin (200)', async () => {
      const token = await loginAsAdmin();
      // JWT strategy validate
      prisma.user.findUnique.mockResolvedValue({ id: ADMIN_ID, email: 'admin@example.com', role: 'ADMIN' });
      prisma.user.count.mockResolvedValue(10);
      prisma.project.count.mockResolvedValue(3);
      prisma.issue.count.mockResolvedValue(25);
      prisma.sprint.count.mockResolvedValue(5);
      prisma.comment.count.mockResolvedValue(50);
      prisma.issue.groupBy.mockResolvedValue([
        { status: 'TODO', _count: 10 },
        { status: 'DONE', _count: 15 },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('users');
      expect(res.body.data).toHaveProperty('projects');
      expect(res.body.data).toHaveProperty('issues');
    });
  });

  describe('PATCH /api/admin/users/:userId/role', () => {
    it('should update user role (200)', async () => {
      const token = await loginAsAdmin();
      // First call: JWT strategy validate, Second call: adminService.updateUserRole
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: ADMIN_ID, email: 'admin@example.com', role: 'ADMIN' })
        .mockResolvedValueOnce({ id: TARGET_USER_ID });
      prisma.user.update.mockResolvedValue({
        id: TARGET_USER_ID,
        email: 'user@example.com',
        fullName: 'Regular User',
        role: 'ADMIN',
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${TARGET_USER_ID}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('role', 'ADMIN');
    });

    it('should return 403 when admin tries to change own role', async () => {
      const token = await loginAsAdmin();
      prisma.user.findUnique.mockResolvedValue({ id: ADMIN_ID, email: 'admin@example.com', role: 'ADMIN' });

      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${ADMIN_ID}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'USER' });

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid role value', async () => {
      const token = await loginAsAdmin();
      prisma.user.findUnique.mockResolvedValue({ id: ADMIN_ID, email: 'admin@example.com', role: 'ADMIN' });

      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${TARGET_USER_ID}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'SUPERADMIN' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/users/:userId', () => {
    it('should delete user (204)', async () => {
      const token = await loginAsAdmin();
      // First call: JWT strategy validate, Second call: adminService.deleteUser
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: ADMIN_ID, email: 'admin@example.com', role: 'ADMIN' })
        .mockResolvedValueOnce({ id: TARGET_USER_ID });
      prisma.user.delete.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .delete(`/api/admin/users/${TARGET_USER_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });

    it('should return 403 when admin tries to delete self', async () => {
      const token = await loginAsAdmin();
      // JWT strategy validate returns admin user
      prisma.user.findUnique.mockResolvedValue({ id: ADMIN_ID, email: 'admin@example.com', role: 'ADMIN' });

      const res = await request(app.getHttpServer())
        .delete(`/api/admin/users/${ADMIN_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
