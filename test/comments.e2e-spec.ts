import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2EApp } from './helpers/e2e-setup.helper';

describe('Comments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    ({ app, prisma } = await createE2EApp());
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST .../issues/:issueId/comments', () => {
    it('should create comment (201)', () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.comment.create.mockResolvedValue({
        id: 'comment-1',
        content: 'Looks good!',
        authorId: 'uuid-1',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/issues/TRK-1/comments')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'Looks good!' })
        .expect(201);
    });

    it('should create reply with parentId (201)', () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.comment.create.mockResolvedValue({
        id: 'comment-2',
        content: 'Thanks!',
        parentId: 'comment-1',
      });

      return request(app.getHttpServer())
        .post('/api/projects/proj-1/issues/TRK-1/comments')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'Thanks!', parentId: 'comment-1' })
        .expect(201);
    });

    it('should return 400 for empty content', () => {
      return request(app.getHttpServer())
        .post('/api/projects/proj-1/issues/TRK-1/comments')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/projects/proj-1/issues/TRK-1/comments')
        .send({ content: 'Test' })
        .expect(401);
    });
  });

  describe('GET .../issues/:issueId/comments', () => {
    it('should return threaded comments', () => {
      prisma.comment.findMany.mockResolvedValue([
        { id: 'comment-1', content: 'Root', replies: [] },
      ]);

      return request(app.getHttpServer())
        .get('/api/projects/proj-1/issues/TRK-1/comments')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('PATCH .../comments/:commentId', () => {
    it('should update comment (200)', () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: 'uuid-1',
      });
      prisma.comment.update.mockResolvedValue({
        id: 'comment-1',
        content: 'Updated',
      });

      return request(app.getHttpServer())
        .patch('/api/projects/proj-1/issues/TRK-1/comments/comment-1')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'Updated' })
        .expect(200);
    });

    it('should return 403 if not the author', () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: 'other-user',
      });

      return request(app.getHttpServer())
        .patch('/api/projects/proj-1/issues/TRK-1/comments/comment-1')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE .../comments/:commentId', () => {
    it('should delete comment (200)', () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: 'uuid-1',
      });
      prisma.comment.delete.mockResolvedValue({});

      return request(app.getHttpServer())
        .delete('/api/projects/proj-1/issues/TRK-1/comments/comment-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });
});
