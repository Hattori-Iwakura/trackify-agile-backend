import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2EApp } from './helpers/e2e-setup.helper';

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    ({ app, prisma } = await createE2EApp());
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/notifications', () => {
    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/notifications')
        .expect(401);
    });

    it('should return paginated notifications (200)', () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      return request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count (200)', () => {
      prisma.notification.count.mockResolvedValue(3);

      return request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark notification as read (200)', () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'uuid-1',
        read: false,
      });
      prisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        read: true,
      });

      return request(app.getHttpServer())
        .patch('/api/notifications/notif-1/read')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });

    it('should return 404 for non-existent notification', () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .patch('/api/notifications/non-existent/read')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('should mark all as read (200)', () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      return request(app.getHttpServer())
        .patch('/api/notifications/read-all')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });
});
