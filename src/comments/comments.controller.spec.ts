import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { ProjectRoleGuard } from '../projects/guards/project-role.guard';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAllForIssue: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      resolveIssueByKey: jest.fn().mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        projectId: 'proj-1',
        reporterId: 'reporter-1',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [{ provide: CommentsService, useValue: service }],
    })
      .overrideGuard(ProjectRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

      const result = await controller.create('TRK-1', { id: 'uuid-1' }, dto, 'proj-1');

      expect(service.resolveIssueByKey).toHaveBeenCalledWith('proj-1', 'TRK-1');
      expect(service.create).toHaveBeenCalledWith('issue-1', 'uuid-1', dto, {
        projectId: 'proj-1',
        issueKey: 'TRK-1',
      });
      expect(result).toHaveProperty('content', 'Great progress!');
    });
  });

  describe('GET .../issues/:issueId/comments', () => {
    it('should return threaded comments', async () => {
      service.findAllForIssue.mockResolvedValue([
        { id: 'comment-1', replies: [] },
      ]);

      const result = await controller.findAll('TRK-1', 'proj-1');

      expect(service.resolveIssueByKey).toHaveBeenCalledWith('proj-1', 'TRK-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('PATCH .../comments/:commentId', () => {
    it('should update comment', async () => {
      service.update.mockResolvedValue({
        id: 'comment-1',
        content: 'Updated',
      });

      const mockReq = { projectMember: { role: 'MEMBER' } };
      const result = await controller.update('comment-1', { id: 'uuid-1' }, {
        content: 'Updated',
      }, mockReq);

      expect(service.update).toHaveBeenCalledWith('comment-1', 'uuid-1', { content: 'Updated' }, 'MEMBER');
      expect(result.content).toBe('Updated');
    });
  });

  describe('DELETE .../comments/:commentId', () => {
    it('should delete comment', async () => {
      service.remove.mockResolvedValue(undefined);

      const mockReq = { projectMember: { role: 'OWNER' } };
      await expect(
        controller.remove('comment-1', { id: 'uuid-1' }, mockReq),
      ).resolves.not.toThrow();
      expect(service.remove).toHaveBeenCalledWith('comment-1', 'uuid-1', 'OWNER');
    });
  });
});
