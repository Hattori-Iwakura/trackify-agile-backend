import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAllForIssue: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [{ provide: CommentsService, useValue: service }],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
  });

  describe('POST .../issues/:issueId/comments', () => {
    it('should create comment and return 201', async () => {
      const dto = { content: 'Great progress!' };
      service.create.mockResolvedValue({
        id: 'comment-1',
        ...dto,
        authorId: 'uuid-1',
      });

      const result = await controller.create('issue-1', { id: 'uuid-1' }, dto);

      expect(service.create).toHaveBeenCalledWith('issue-1', 'uuid-1', dto);
      expect(result).toHaveProperty('content', 'Great progress!');
    });
  });

  describe('GET .../issues/:issueId/comments', () => {
    it('should return threaded comments', async () => {
      service.findAllForIssue.mockResolvedValue([
        { id: 'comment-1', replies: [] },
      ]);

      const result = await controller.findAll('issue-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('PATCH .../comments/:commentId', () => {
    it('should update comment', async () => {
      service.update.mockResolvedValue({
        id: 'comment-1',
        content: 'Updated',
      });

      const result = await controller.update('comment-1', { id: 'uuid-1' }, {
        content: 'Updated',
      });

      expect(result.content).toBe('Updated');
    });
  });

  describe('DELETE .../comments/:commentId', () => {
    it('should delete comment', async () => {
      service.remove.mockResolvedValue(undefined);

      await expect(
        controller.remove('comment-1', { id: 'uuid-1' }),
      ).resolves.not.toThrow();
    });
  });
});
