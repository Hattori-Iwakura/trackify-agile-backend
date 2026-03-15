import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
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
      });

      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'password123', fullName: 'New User' })
        .expect(201);
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'password123', fullName: 'Test' })
        .expect(400);
    });

    it('should return 400 for short password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: '123', fullName: 'Test' })
        .expect(400);
    });

    it('should return 409 for duplicate email', () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'existing@example.com', password: 'password123', fullName: 'Test' })
        .expect(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login and return tokens', () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        password: '$2b$10$hashedpassword',
        role: 'USER',
      });

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
        });
    });

    it('should return 401 for wrong password', () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        password: '$2b$10$hashedpassword',
      });

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return new access token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
        });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 on successful logout', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });
});
