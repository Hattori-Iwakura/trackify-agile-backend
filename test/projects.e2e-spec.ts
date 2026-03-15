import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
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

  describe('POST /api/projects', () => {
    it('should create project (201)', () => {
      prisma.project.findUnique.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        key: 'TP',
      });
      prisma.projectMember.create.mockResolvedValue({});

      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test Project', key: 'TP' })
        .expect(201);
    });

    it('should return 400 for missing name', () => {
      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({ key: 'TP' })
        .expect(400);
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/projects')
        .send({ name: 'Test', key: 'TP' })
        .expect(401);
    });

    it('should return 409 for duplicate key', () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'existing' });

      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test', key: 'TP' })
        .expect(409);
    });
  });

  describe('GET /api/projects', () => {
    it('should return paginated list', () => {
      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      return request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project details', () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test',
        members: [],
      });

      return request(app.getHttpServer())
        .get('/api/projects/proj-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });

    it('should return 404 for unknown id', () => {
      prisma.project.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/api/projects/unknown')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });

  describe('Members', () => {
    it('should add member', () => {
      prisma.projectMember.findUnique.mockResolvedValue(null);
      prisma.projectMember.create.mockResolvedValue({
        userId: 'uuid-2',
        role: 'MEMBER',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/members')
        .set('Authorization', 'Bearer valid-token')
        .send({ userId: 'uuid-2', role: 'MEMBER' })
        .expect(201);
    });

    it('should remove member', () => {
      prisma.projectMember.findUnique.mockResolvedValue({
        userId: 'uuid-2',
        role: 'MEMBER',
      });
      prisma.projectMember.delete.mockResolvedValue({});

      return request(app.getHttpServer())
        .delete('/api/projects/proj-1/members/uuid-2')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('Labels', () => {
    it('should create label for project', () => {
      prisma.label.findUnique.mockResolvedValue(null);
      prisma.label.create.mockResolvedValue({
        id: 'label-1',
        name: 'bug',
        color: '#ff0000',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/labels')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'bug', color: '#ff0000' })
        .expect(201);
    });

    it('should list labels', () => {
      prisma.label.findMany.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get('/api/projects/proj-1/labels')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });
});
