process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { createE2EApp } from './helpers/e2e-setup.helper';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    ({ app, prisma } = await createE2EApp());
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        email: 'new@example.com',
        fullName: 'New User',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'Password1!', fullName: 'New User' })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('email', 'new@example.com');
          expect(res.body.data).not.toHaveProperty('password');
        });
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'Password1!', fullName: 'Test' })
        .expect(400);
    });

    it('should return 400 for weak password (no uppercase)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password1!', fullName: 'Test' })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
        });
    });

    it('should return 400 for weak password (no special char)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'Password1', fullName: 'Test' })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
        });
    });

    it('should return 400 for short password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'Pa1!', fullName: 'Test' })
        .expect(400);
    });

    it('should return 409 for duplicate email', () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'existing@example.com', password: 'Password1!', fullName: 'Test' })
        .expect(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login and return tokens', async () => {
      const hashedPassword = await bcrypt.hash('Password1!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        password: hashedPassword,
        fullName: 'Test User',
        role: 'USER',
      });
      prisma.user.update.mockResolvedValue({});

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1!' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
        });
    });

    it('should return 401 for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('Password1!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        password: hashedPassword,
      });

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPassword1!' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return 401 for non-existent email', () => {
      prisma.user.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Password1!' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return new access token for valid refresh token', async () => {
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

      const { refreshToken } = loginRes.body.data;

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
        hashedRefreshToken,
      });

      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
        });
    });

    it('should return 401 for invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 on successful logout', async () => {
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

      const { accessToken } = loginRes.body.data;

      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
      });

      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
        });
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);
    });
  });

  describe('Full auth lifecycle', () => {
    it('should register -> login -> refresh -> logout -> reject refresh', async () => {
      // 1. Register
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        email: 'lifecycle@example.com',
        fullName: 'Lifecycle User',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'lifecycle@example.com', password: 'Password1!', fullName: 'Lifecycle User' })
        .expect(201);

      // 2. Login
      const hashedPassword = await bcrypt.hash('Password1!', 10);
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'uuid-1',
        email: 'lifecycle@example.com',
        password: hashedPassword,
        fullName: 'Lifecycle User',
        role: 'USER',
      });
      prisma.user.update.mockResolvedValue({});

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'lifecycle@example.com', password: 'Password1!' })
        .expect(200);

      const { accessToken, refreshToken } = loginRes.body.data;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // 3. Refresh
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'uuid-1',
        email: 'lifecycle@example.com',
        role: 'USER',
        hashedRefreshToken,
      });

      const refreshRes = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshRes.body.data.accessToken).toBeDefined();

      // 4. Logout
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'uuid-1',
        email: 'lifecycle@example.com',
        role: 'USER',
      });
      prisma.user.update.mockResolvedValue({});

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 5. Refresh should fail after logout (hashedRefreshToken is null)
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'uuid-1',
        email: 'lifecycle@example.com',
        role: 'USER',
        hashedRefreshToken: null,
      });

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
