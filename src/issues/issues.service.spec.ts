import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers/mock-prisma.helper';

describe('IssuesService', () => {
  let service: IssuesService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<IssuesService>(IssuesService);
  });

  describe('create', () => {
    const createDto = { title: 'Fix bug', description: 'Details', priority: 'HIGH', type: 'BUG' };

    it('should create issue with auto-generated issueKey', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', key: 'TRK' });
      prisma.issue.count.mockResolvedValue(5);
      prisma.issue.create.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-6',
        issueNumber: 6,
        ...createDto,
        status: 'TODO',
      });

      const result = await service.create('proj-1', createDto, 'uuid-1');

      expect(result.issueKey).toMatch(/^TRK-\d+$/);
    });

    it('should set default status to TODO and priority to MEDIUM', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', key: 'TRK' });
      prisma.issue.count.mockResolvedValue(0);
      prisma.issue.create.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        status: 'TODO',
        priority: 'MEDIUM',
        title: 'Test',
      });

      const result = await service.create('proj-1', { title: 'Test' }, 'uuid-1');

      expect(result.status).toBe('TODO');
    });
  });

  describe('findAll', () => {
    it('should return paginated issues for project', async () => {
      prisma.issue.findMany.mockResolvedValue([{ id: 'issue-1' }]);
      prisma.issue.count.mockResolvedValue(1);

      const result = await service.findAll('proj-1', { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });

    it('should apply status filter', async () => {
      prisma.issue.findMany.mockResolvedValue([]);
      prisma.issue.count.mockResolvedValue(0);

      await service.findAll('proj-1', { page: 1, limit: 20, status: 'IN_PROGRESS' });

      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });

    it('should apply search query on title', async () => {
      prisma.issue.findMany.mockResolvedValue([]);
      prisma.issue.count.mockResolvedValue(0);

      await service.findAll('proj-1', { page: 1, limit: 20, search: 'bug' });

      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return issue with relations', async () => {
      prisma.issue.findUnique.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        labels: [],
        attachments: [],
        assignee: null,
        reporter: { id: 'uuid-1' },
      });

      const result = await service.findOne('TRK-1');

      expect(result).toHaveProperty('issueKey', 'TRK-1');
    });

    it('should throw NotFoundException for non-existent issue', async () => {
      prisma.issue.findUnique.mockResolvedValue(null);

      await expect(service.findOne('TRK-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should transition status', async () => {
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        status: 'IN_PROGRESS',
      });

      const result = await service.updateStatus('TRK-1', 'IN_PROGRESS');

      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('updatePosition', () => {
    it('should reorder issues within same status column', async () => {
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        position: 3,
      });

      const result = await service.updatePosition('TRK-1', { position: 3 });

      expect(result.position).toBe(3);
    });
  });

  describe('getBoard', () => {
    it('should return issues grouped by IssueStatus', async () => {
      prisma.issue.findMany.mockResolvedValue([
        { id: '1', status: 'TODO', position: 0 },
        { id: '2', status: 'TODO', position: 1 },
        { id: '3', status: 'IN_PROGRESS', position: 0 },
      ]);

      const result = await service.getBoard('proj-1');

      expect(result).toHaveProperty('TODO');
      expect(result).toHaveProperty('IN_PROGRESS');
    });
  });

  describe('addLabel', () => {
    it('should create IssueLabel junction record', async () => {
      prisma.issueLabel.create.mockResolvedValue({
        issueId: 'issue-1',
        labelId: 'label-1',
      });

      await expect(service.addLabel('issue-1', 'label-1')).resolves.not.toThrow();
    });
  });

  describe('removeLabel', () => {
    it('should delete IssueLabel junction record', async () => {
      prisma.issueLabel.delete.mockResolvedValue({});

      await expect(service.removeLabel('issue-1', 'label-1')).resolves.not.toThrow();
    });
  });
});
