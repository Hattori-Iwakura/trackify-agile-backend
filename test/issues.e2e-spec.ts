import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2EApp } from './helpers/e2e-setup.helper';

describe('Issues (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    ({ app, prisma } = await createE2EApp());
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/projects/:projectId/issues', () => {
    it('should create issue (201)', () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', key: 'TRK' });
      prisma.issue.count.mockResolvedValue(0);
      prisma.issue.create.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        title: 'Test issue',
        status: 'TODO',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/issues')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Test issue' })
        .expect(201);
    });

    it('should return 400 for missing title', () => {
      return request(app.getHttpServer())
        .post('/api/projects/proj-1/issues')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/projects/proj-1/issues')
        .send({ title: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/projects/:projectId/issues', () => {
    it('should return paginated issues', () => {
      prisma.issue.findMany.mockResolvedValue([]);
      prisma.issue.count.mockResolvedValue(0);

      return request(app.getHttpServer())
        .get('/api/projects/proj-1/issues')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });

    it('should filter by status', () => {
      prisma.issue.findMany.mockResolvedValue([]);
      prisma.issue.count.mockResolvedValue(0);

      return request(app.getHttpServer())
        .get('/api/projects/proj-1/issues?status=IN_PROGRESS')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('GET /api/projects/:projectId/board', () => {
    it('should return issues grouped by status columns', () => {
      prisma.issue.findMany.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get('/api/projects/proj-1/board')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('PATCH .../issues/:issueKey/status', () => {
    it('should change status', () => {
      prisma.issue.update.mockResolvedValue({
        issueKey: 'TRK-1',
        status: 'IN_PROGRESS',
      });

      return request(app.getHttpServer())
        .patch('/api/projects/proj-1/issues/TRK-1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'IN_PROGRESS' })
        .expect(200);
    });
  });

  describe('Attachments', () => {
    it('should upload file attachment (201)', () => {
      prisma.attachment.create.mockResolvedValue({
        id: 'att-1',
        filename: 'test.pdf',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/issues/TRK-1/attachments')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('content'), 'test.pdf')
        .expect(201);
    });

    it('should list attachments', () => {
      prisma.attachment.findMany.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get('/api/projects/proj-1/issues/TRK-1/attachments')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });

    it('should delete attachment', () => {
      prisma.attachment.findUnique.mockResolvedValue({
        id: 'att-1',
        uploaderId: 'uuid-1',
      });
      prisma.attachment.delete.mockResolvedValue({});

      return request(app.getHttpServer())
        .delete('/api/projects/proj-1/issues/TRK-1/attachments/att-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });
});
