import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2EApp } from './helpers/e2e-setup.helper';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    ({ app, prisma } = await createE2EApp());
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/users/me', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);
    });

    it('should return user profile with valid token', () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: null,
        role: 'USER',
      });

      return request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('email', 'test@example.com');
        });
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update fullName', () => {
      prisma.user.update.mockResolvedValue({
        id: 'uuid-1',
        fullName: 'Updated Name',
      });

      return request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ fullName: 'Updated Name' })
        .expect(200);
    });

    it('should return 400 for invalid data', () => {
      return request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ fullName: '' })
        .expect(400);
    });
  });

  describe('POST /api/users/me/avatar', () => {
    it('should upload avatar file and return updated user', () => {
      prisma.user.update.mockResolvedValue({
        id: 'uuid-1',
        avatarUrl: '/uploads/avatar.jpg',
      });

      return request(app.getHttpServer())
        .post('/api/users/me/avatar')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('fake-image'), 'avatar.jpg')
        .expect(201);
    });
  });
});
