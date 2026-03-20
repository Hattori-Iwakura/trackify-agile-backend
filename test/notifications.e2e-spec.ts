process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { createE2EApp } from './helpers/e2e-setup.helper';

const USER_ID = '00000000-0000-4000-a000-000000000001';
const NOTIF_ID = '00000000-0000-4000-a000-000000000050';

describe('Notifications (e2e)', () => {
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

  describe('GET /api/notifications', () => {
    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/notifications')
        .expect(401);
    });

    it('should return paginated notifications (200)', async () => {
      const token = await loginAndGetToken();

      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      return request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('meta');
        });
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count (200)', async () => {
      const token = await loginAndGetToken();

      prisma.notification.count.mockResolvedValue(3);

      return request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toBe(3);
        });
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark notification as read (200)', async () => {
      const token = await loginAndGetToken();

      prisma.notification.findUnique.mockResolvedValue({
        id: NOTIF_ID,
        userId: USER_ID,
        read: false,
      });
      prisma.notification.update.mockResolvedValue({
        id: NOTIF_ID,
        read: true,
      });

      return request(app.getHttpServer())
        .patch(`/api/notifications/${NOTIF_ID}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('read', true);
        });
    });

    it('should return 404 for non-existent notification', async () => {
      const token = await loginAndGetToken();

      prisma.notification.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .patch(`/api/notifications/${NOTIF_ID}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.errorCode).toBe('NOTIFICATION_NOT_FOUND');
        });
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('should mark all as read (200)', async () => {
      const token = await loginAndGetToken();

      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      return request(app.getHttpServer())
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('count', 5);
        });
    });
  });
});
