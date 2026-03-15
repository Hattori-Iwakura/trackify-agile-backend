import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers/mock-prisma.helper';

describe('CommentsService', () => {
  let service: CommentsService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  describe('create', () => {
    it('should create a comment on an issue', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.comment.create.mockResolvedValue({
        id: 'comment-1',
        content: 'This is a comment',
        issueId: 'issue-1',
        authorId: 'uuid-1',
      });

      const result = await service.create('issue-1', 'uuid-1', {
        content: 'This is a comment',
      });

      expect(result).toHaveProperty('content', 'This is a comment');
    });

    it('should create a threaded reply with parentId', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.comment.create.mockResolvedValue({
        id: 'comment-2',
        content: 'Reply to comment',
        issueId: 'issue-1',
        authorId: 'uuid-1',
        parentId: 'comment-1',
      });

      const result = await service.create('issue-1', 'uuid-1', {
        content: 'Reply to comment',
        parentId: 'comment-1',
      });

      expect(result).toHaveProperty('parentId', 'comment-1');
    });

    it('should throw NotFoundException if issue does not exist', async () => {
      prisma.issue.findUnique.mockResolvedValue(null);

      await expect(
        service.create('non-existent', 'uuid-1', { content: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllForIssue', () => {
    it('should return threaded comments ordered by creation date', async () => {
      prisma.comment.findMany.mockResolvedValue([
        {
          id: 'comment-1',
          content: 'First comment',
          parentId: null,
          replies: [{ id: 'comment-2', content: 'Reply' }],
        },
      ]);

      const result = await service.findAllForIssue('issue-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('replies');
    });
  });

  describe('update', () => {
    it('should update comment content', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: 'uuid-1',
      });
      prisma.comment.update.mockResolvedValue({
        id: 'comment-1',
        content: 'Updated content',
      });

      const result = await service.update('comment-1', 'uuid-1', {
        content: 'Updated content',
      });

      expect(result.content).toBe('Updated content');
    });

    it('should throw ForbiddenException if not the author', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: 'other-user',
      });

      await expect(
        service.update('comment-1', 'uuid-1', { content: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', 'uuid-1', { content: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete comment and cascade replies', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: 'uuid-1',
      });
      prisma.comment.delete.mockResolvedValue({});

      await expect(service.remove('comment-1', 'uuid-1')).resolves.not.toThrow();
    });

    it('should throw ForbiddenException if not the author', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: 'other-user',
      });

      await expect(service.remove('comment-1', 'uuid-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
