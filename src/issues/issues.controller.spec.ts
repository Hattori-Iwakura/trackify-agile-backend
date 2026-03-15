import { Test, TestingModule } from '@nestjs/testing';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';

describe('IssuesController', () => {
  let controller: IssuesController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      updateStatus: jest.fn(),
      updatePosition: jest.fn(),
      getBoard: jest.fn(),
      addLabel: jest.fn(),
      removeLabel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IssuesController],
      providers: [{ provide: IssuesService, useValue: service }],
    }).compile();

    controller = module.get<IssuesController>(IssuesController);
  });

  describe('POST /projects/:projectId/issues', () => {
    it('should create issue and return result', async () => {
      const dto = { title: 'New issue' };
      service.create.mockResolvedValue({ id: 'issue-1', issueKey: 'TRK-1', ...dto });

      const result = await controller.create('proj-1', { id: 'uuid-1' }, dto);

      expect(service.create).toHaveBeenCalledWith('proj-1', dto, 'uuid-1');
      expect(result).toHaveProperty('issueKey');
    });
  });

  describe('GET /projects/:projectId/issues', () => {
    it('should return paginated issues', async () => {
      service.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      const result = await controller.findAll('proj-1', {});

      expect(result).toHaveProperty('data');
    });
  });

  describe('GET /projects/:projectId/issues/:issueKey', () => {
    it('should return single issue', async () => {
      service.findOne.mockResolvedValue({ issueKey: 'TRK-1' });

      const result = await controller.findOne('TRK-1');

      expect(result.issueKey).toBe('TRK-1');
    });
  });

  describe('GET /projects/:projectId/board', () => {
    it('should return board data grouped by status', async () => {
      service.getBoard.mockResolvedValue({ TODO: [], IN_PROGRESS: [], DONE: [] });

      const result = await controller.getBoard('proj-1');

      expect(result).toHaveProperty('TODO');
    });
  });

  describe('PATCH .../issues/:issueKey/status', () => {
    it('should update status', async () => {
      service.updateStatus.mockResolvedValue({ issueKey: 'TRK-1', status: 'DONE' });

      const result = await controller.updateStatus('TRK-1', { status: 'DONE' });

      expect(result.status).toBe('DONE');
    });
  });

  describe('PATCH .../issues/:issueKey/position', () => {
    it('should update position', async () => {
      service.updatePosition.mockResolvedValue({ issueKey: 'TRK-1', position: 2 });

      const result = await controller.updatePosition('TRK-1', { position: 2 });

      expect(result.position).toBe(2);
    });
  });

  describe('DELETE /projects/:projectId/issues/:issueKey', () => {
    it('should delete issue', async () => {
      service.remove.mockResolvedValue(undefined);

      await expect(controller.remove('TRK-1')).resolves.not.toThrow();
    });
  });
});
