import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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
    const createDto = {
      title: 'Fix bug',
      description: 'Details',
      priority: 'HIGH' as const,
      type: 'BUG' as const,
    };

    it('should create issue with auto-generated issueKey via issueSequence', async () => {
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.project.update.mockResolvedValue({ key: 'TRK', issueSequence: 6 });
      prisma.issue.create.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-6',
        issueNumber: 6,
        ...createDto,
        status: 'TODO',
        labels: [],
      });

      const result = await service.create('proj-1', createDto, 'uuid-1');

      expect(result.issueKey).toMatch(/^TRK-\d+$/);
    });

    it('should validate assignee is a project member', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create('proj-1', { ...createDto, assigneeId: 'non-member' }, 'uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should attach labels when labelIds provided', async () => {
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.project.update.mockResolvedValue({ key: 'TRK', issueSequence: 7 });
      prisma.issue.create.mockResolvedValue({
        id: 'issue-2',
        issueKey: 'TRK-7',
        issueNumber: 7,
        ...createDto,
        status: 'TODO',
      });
      prisma.issueLabel.createMany.mockResolvedValue({ count: 2 });
      prisma.issueLabel.findMany.mockResolvedValue([
        { issueId: 'issue-2', labelId: 'lbl-1', label: { id: 'lbl-1', name: 'Bug' } },
        { issueId: 'issue-2', labelId: 'lbl-2', label: { id: 'lbl-2', name: 'Urgent' } },
      ]);

      const result = await service.create(
        'proj-1',
        { ...createDto, labelIds: ['lbl-1', 'lbl-2'] },
        'uuid-1',
      );

      expect(result.labels).toHaveLength(2);
      expect(prisma.issueLabel.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
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

    it('should apply search query on title, description, and issueKey', async () => {
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

      const result = await service.findOne('proj-1', 'TRK-1');

      expect(result).toHaveProperty('issueKey', 'TRK-1');
    });

    it('should throw NotFoundException for non-existent issue', async () => {
      prisma.issue.findUnique.mockResolvedValue(null);

      await expect(service.findOne('proj-1', 'TRK-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update issue fields', async () => {
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        title: 'Updated title',
      });

      const result = await service.update('proj-1', 'TRK-1', { title: 'Updated title' });

      expect(result.title).toBe('Updated title');
    });

    it('should validate assignee when assigneeId provided', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({ userId: 'user-1', projectId: 'proj-1' });
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        assigneeId: 'user-1',
      });

      await service.update('proj-1', 'TRK-1', { assigneeId: 'user-1' });

      expect(prisma.projectMember.findUnique).toHaveBeenCalled();
    });

    it('should throw NotFoundException when issue not found (P2025)', async () => {
      prisma.issue.update.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.update('proj-1', 'TRK-999', { title: 'Nope' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should rethrow non-P2025 errors', async () => {
      const error = new Error('DB connection lost');
      prisma.issue.update.mockRejectedValue(error);

      await expect(
        service.update('proj-1', 'TRK-1', { title: 'Nope' }),
      ).rejects.toThrow('DB connection lost');
    });
  });

  describe('updateStatus', () => {
    it('should transition status', async () => {
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK-1',
        status: 'IN_PROGRESS',
      });

      const result = await service.updateStatus('proj-1', 'TRK-1', 'IN_PROGRESS');

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should throw NotFoundException when issue not found (P2025)', async () => {
      prisma.issue.update.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.updateStatus('proj-1', 'TRK-999', 'DONE'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should rethrow non-P2025 errors', async () => {
      const error = new Error('DB error');
      prisma.issue.update.mockRejectedValue(error);

      await expect(
        service.updateStatus('proj-1', 'TRK-1', 'DONE'),
      ).rejects.toThrow('DB error');
    });
  });

  describe('remove', () => {
    it('should delete issue by projectId and issueKey', async () => {
      prisma.issue.delete.mockResolvedValue({});

      await expect(service.remove('proj-1', 'TRK-1')).resolves.not.toThrow();
      expect(prisma.issue.delete).toHaveBeenCalledWith({
        where: { projectId_issueNumber: { projectId: 'proj-1', issueNumber: 1 } },
      });
    });

    it('should throw NotFoundException when issue not found (P2025)', async () => {
      prisma.issue.delete.mockRejectedValue({ code: 'P2025' });

      await expect(service.remove('proj-1', 'TRK-999')).rejects.toThrow(NotFoundException);
    });

    it('should rethrow non-P2025 errors', async () => {
      const error = new Error('DB error');
      prisma.issue.delete.mockRejectedValue(error);

      await expect(service.remove('proj-1', 'TRK-1')).rejects.toThrow('DB error');
    });
  });

  describe('reorder', () => {
    it('should reorder issues within same or different status column', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1', status: 'TODO' });
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.issue.updateMany.mockResolvedValue({ count: 2 });
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        position: 3,
        status: 'TODO',
      });

      const result = await service.reorder('proj-1', 'TRK-1', { status: 'TODO', position: 3 });

      expect(result.position).toBe(3);
    });

    it('should throw NotFoundException when issue not found', async () => {
      prisma.issue.findUnique.mockResolvedValue(null);

      await expect(
        service.reorder('proj-1', 'TRK-999', { status: 'TODO', position: 0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBoard', () => {
    it('should return issues grouped by IssueStatus with all 6 columns', async () => {
      prisma.issue.findMany.mockResolvedValue([
        { id: '1', status: 'TODO', position: 0 },
        { id: '2', status: 'TODO', position: 1 },
        { id: '3', status: 'IN_PROGRESS', position: 0 },
      ]);

      const result = await service.getBoard('proj-1');

      expect(Object.keys(result)).toEqual([
        'BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED',
      ]);
      expect(result.TODO).toHaveLength(2);
      expect(result.BACKLOG).toHaveLength(0);
    });

    it('should apply sprintId filter when provided', async () => {
      prisma.issue.findMany.mockResolvedValue([]);

      await service.getBoard('proj-1', 'sprint-1');

      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sprintId: 'sprint-1' }),
        }),
      );
    });
  });

  describe('addLabel', () => {
    it('should create IssueLabel junction record', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.label.findFirst.mockResolvedValue({ id: 'label-1', projectId: 'proj-1' });
      prisma.issueLabel.create.mockResolvedValue({
        issueId: 'issue-1',
        labelId: 'label-1',
      });

      await expect(service.addLabel('proj-1', 'TRK-1', 'label-1')).resolves.not.toThrow();
    });

    it('should throw NotFoundException if label not in same project', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.label.findFirst.mockResolvedValue(null);

      await expect(service.addLabel('proj-1', 'TRK-1', 'label-other')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when issue not found', async () => {
      prisma.issue.findUnique.mockResolvedValue(null);

      await expect(service.addLabel('proj-1', 'TRK-999', 'label-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should be idempotent when label already attached (P2002)', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.label.findFirst.mockResolvedValue({ id: 'label-1', projectId: 'proj-1' });
      prisma.issueLabel.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.addLabel('proj-1', 'TRK-1', 'label-1')).resolves.not.toThrow();
    });

    it('should rethrow non-P2002 errors', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.label.findFirst.mockResolvedValue({ id: 'label-1', projectId: 'proj-1' });
      const error = new Error('DB error');
      prisma.issueLabel.create.mockRejectedValue(error);

      await expect(service.addLabel('proj-1', 'TRK-1', 'label-1')).rejects.toThrow('DB error');
    });
  });

  describe('removeLabel', () => {
    it('should delete IssueLabel junction record', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.issueLabel.delete.mockResolvedValue({});

      await expect(service.removeLabel('proj-1', 'TRK-1', 'label-1')).resolves.not.toThrow();
    });

    it('should throw NotFoundException when issue not found', async () => {
      prisma.issue.findUnique.mockResolvedValue(null);

      await expect(service.removeLabel('proj-1', 'TRK-999', 'label-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when label not attached (P2025)', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.issueLabel.delete.mockRejectedValue({ code: 'P2025' });

      await expect(service.removeLabel('proj-1', 'TRK-1', 'label-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rethrow non-P2025 errors', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      const error = new Error('DB error');
      prisma.issueLabel.delete.mockRejectedValue(error);

      await expect(service.removeLabel('proj-1', 'TRK-1', 'label-1')).rejects.toThrow('DB error');
    });
  });

  describe('parseIssueKey', () => {
    it('should throw BadRequestException for invalid issue key', async () => {
      prisma.issue.findUnique.mockResolvedValue(null);

      await expect(service.findOne('proj-1', 'INVALID')).rejects.toThrow(BadRequestException);
    });

    it('should handle project keys with numbers (e.g., TRK2-42)', async () => {
      prisma.issue.findUnique.mockResolvedValue({
        id: 'issue-1',
        issueKey: 'TRK2-42',
        issueNumber: 42,
      });

      const result = await service.findOne('proj-1', 'TRK2-42');

      expect(result).toHaveProperty('issueNumber', 42);
    });
  });
});
