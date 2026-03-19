process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
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

  describe('GET /api/users/me', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);
    });

    it('should return user profile with valid token', async () => {
      const accessToken = await loginAndGetToken();

      // Mock for JWT strategy validate() + UsersService.findById()
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'uuid-1',
          email: 'test@example.com',
          role: 'USER',
        })
        .mockResolvedValueOnce({
          id: 'uuid-1',
          email: 'test@example.com',
          fullName: 'Test User',
          avatarUrl: null,
          role: 'USER',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      return request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('email', 'test@example.com');
          expect(res.body.data).toHaveProperty('fullName', 'Test User');
          expect(res.body.data).toHaveProperty('role', 'USER');
          expect(res.body.data).not.toHaveProperty('password');
        });
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update fullName', async () => {
      const accessToken = await loginAndGetToken();

      // Mock for JWT strategy validate()
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
      });

      // Mock for UsersService.updateProfile() — user.update
      prisma.user.update.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        fullName: 'Updated Name',
        avatarUrl: null,
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: 'Updated Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('fullName', 'Updated Name');
        });
    });

    it('should return 400 for invalid data (empty fullName)', async () => {
      const accessToken = await loginAndGetToken();

      // Mock for JWT strategy validate()
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
      });

      return request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: '' })
        .expect(400);
    });

    it('should return 409 for duplicate email', async () => {
      const accessToken = await loginAndGetToken();

      // Mock for JWT strategy validate()
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'uuid-1',
          email: 'test@example.com',
          role: 'USER',
        })
        // Mock for email uniqueness check — returns another user
        .mockResolvedValueOnce({ id: 'other-user-id' });

      return request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'taken@example.com' })
        .expect(409);
    });
  });

  describe('POST /api/users/me/avatar', () => {
    it('should upload avatar file and return updated user', async () => {
      const accessToken = await loginAndGetToken();

      // Mock for JWT strategy validate() + old avatar check
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'uuid-1',
          email: 'test@example.com',
          role: 'USER',
        })
        .mockResolvedValueOnce({ avatarUrl: null });

      prisma.user.update.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: '/uploads/avatars/some-uuid.jpg',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return request(app.getHttpServer())
        .post('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', Buffer.from('fake-image-data'), {
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('avatarUrl');
        });
    });

    it('should return 400 for invalid file type (text file)', async () => {
      const accessToken = await loginAndGetToken();

      // Mock for JWT strategy validate()
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
      });

      return request(app.getHttpServer())
        .post('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', Buffer.from('not an image'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });
  });
});
