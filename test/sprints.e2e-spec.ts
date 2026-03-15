import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2EApp } from './helpers/e2e-setup.helper';

describe('Sprints (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    ({ app, prisma } = await createE2EApp());
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/projects/:projectId/sprints', () => {
    it('should create sprint (201)', () => {
      prisma.sprint.create.mockResolvedValue({
        id: 'sprint-1',
        name: 'Sprint 1',
        status: 'PLANNING',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/sprints')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Sprint 1', startDate: '2026-03-15', endDate: '2026-03-29' })
        .expect(201);
    });

    it('should return 400 for missing name', () => {
      return request(app.getHttpServer())
        .post('/api/projects/proj-1/sprints')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/projects/proj-1/sprints')
        .send({ name: 'Sprint 1' })
        .expect(401);
    });
  });

  describe('GET /api/projects/:projectId/sprints', () => {
    it('should return all sprints for project', () => {
      prisma.sprint.findMany.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get('/api/projects/proj-1/sprints')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('POST .../sprints/:sprintId/start', () => {
    it('should start sprint (200)', () => {
      prisma.sprint.findUnique.mockResolvedValue({
        id: 'sprint-1',
        status: 'PLANNING',
        projectId: 'proj-1',
      });
      prisma.sprint.findFirst.mockResolvedValue(null);
      prisma.sprint.update.mockResolvedValue({
        id: 'sprint-1',
        status: 'ACTIVE',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/sprints/sprint-1/start')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });

    it('should return 400 for invalid transition', () => {
      prisma.sprint.findUnique.mockResolvedValue({
        id: 'sprint-1',
        status: 'COMPLETED',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/sprints/sprint-1/start')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);
    });
  });

  describe('POST .../sprints/:sprintId/complete', () => {
    it('should complete sprint (200)', () => {
      prisma.sprint.findUnique.mockResolvedValue({
        id: 'sprint-1',
        status: 'ACTIVE',
      });
      prisma.sprint.update.mockResolvedValue({
        id: 'sprint-1',
        status: 'COMPLETED',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/sprints/sprint-1/complete')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('GET /api/projects/:projectId/backlog', () => {
    it('should return unassigned issues', () => {
      prisma.issue.findMany.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get('/api/projects/proj-1/backlog')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('Sprint issue management', () => {
    it('should add issue to sprint (200)', () => {
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        sprintId: 'sprint-1',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/sprints/sprint-1/issues/issue-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });

    it('should remove issue from sprint (200)', () => {
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        sprintId: null,
      });

      return request(app.getHttpServer())
        .delete('/api/projects/proj-1/sprints/sprint-1/issues/issue-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });
});
