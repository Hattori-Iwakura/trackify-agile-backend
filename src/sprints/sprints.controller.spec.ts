import { Test, TestingModule } from '@nestjs/testing';
import { SprintsController } from './sprints.controller';
import { SprintsService } from './sprints.service';

describe('SprintsController', () => {
  let controller: SprintsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      start: jest.fn(),
      complete: jest.fn(),
      getBacklog: jest.fn(),
      addIssueToSprint: jest.fn(),
      removeIssueFromSprint: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SprintsController],
      providers: [{ provide: SprintsService, useValue: service }],
    }).compile();

    controller = module.get<SprintsController>(SprintsController);
  });

  describe('POST /projects/:projectId/sprints', () => {
    it('should create sprint and return result', async () => {
      const dto = { name: 'Sprint 1' };
      service.create.mockResolvedValue({ id: 'sprint-1', ...dto, status: 'PLANNING' });

      const result = await controller.create('proj-1', dto);

      expect(service.create).toHaveBeenCalledWith('proj-1', dto);
      expect(result).toHaveProperty('status', 'PLANNING');
    });
  });

  describe('GET /projects/:projectId/sprints', () => {
    it('should return all sprints', async () => {
      service.findAll.mockResolvedValue([{ id: 'sprint-1' }]);

      const result = await controller.findAll('proj-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('GET /projects/:projectId/sprints/:sprintId', () => {
    it('should return single sprint', async () => {
      service.findOne.mockResolvedValue({ id: 'sprint-1', name: 'Sprint 1' });

      const result = await controller.findOne('sprint-1');

      expect(result.name).toBe('Sprint 1');
    });
  });

  describe('PATCH /projects/:projectId/sprints/:sprintId', () => {
    it('should update sprint', async () => {
      service.update.mockResolvedValue({ id: 'sprint-1', name: 'Updated' });

      const result = await controller.update('sprint-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });
  });

  describe('POST .../sprints/:sprintId/start', () => {
    it('should start sprint', async () => {
      service.start.mockResolvedValue({ id: 'sprint-1', status: 'ACTIVE' });

      const result = await controller.start('sprint-1');

      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('POST .../sprints/:sprintId/complete', () => {
    it('should complete sprint', async () => {
      service.complete.mockResolvedValue({ id: 'sprint-1', status: 'COMPLETED' });

      const result = await controller.complete('sprint-1');

      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('GET /projects/:projectId/backlog', () => {
    it('should return backlog issues', async () => {
      service.getBacklog.mockResolvedValue([{ id: 'issue-1' }]);

      const result = await controller.getBacklog('proj-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('POST .../sprints/:sprintId/issues/:issueId', () => {
    it('should add issue to sprint', async () => {
      service.addIssueToSprint.mockResolvedValue({ id: 'issue-1', sprintId: 'sprint-1' });

      const result = await controller.addIssue('sprint-1', 'issue-1');

      expect(result.sprintId).toBe('sprint-1');
    });
  });

  describe('DELETE .../sprints/:sprintId/issues/:issueId', () => {
    it('should remove issue from sprint', async () => {
      service.removeIssueFromSprint.mockResolvedValue({ id: 'issue-1', sprintId: null });

      await expect(controller.removeIssue('sprint-1', 'issue-1')).resolves.not.toThrow();
    });
  });
});
