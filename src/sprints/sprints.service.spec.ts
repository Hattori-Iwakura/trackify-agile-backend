import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SprintsService } from './sprints.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers/mock-prisma.helper';

describe('SprintsService', () => {
  let service: SprintsService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SprintsService>(SprintsService);
  });

  describe('create', () => {
    const createDto = { name: 'Sprint 1', startDate: '2026-03-15', endDate: '2026-03-29' };

    it('should create sprint with PLANNING status by default', async () => {
      prisma.sprint.create.mockResolvedValue({
        id: 'sprint-1',
        ...createDto,
        status: 'PLANNING',
      });

      const result = await service.create('proj-1', createDto);

      expect(result.status).toBe('PLANNING');
    });
  });

  describe('findAll', () => {
    it('should return all sprints for a project', async () => {
      prisma.sprint.findMany.mockResolvedValue([
        { id: 'sprint-1', name: 'Sprint 1', status: 'COMPLETED' },
        { id: 'sprint-2', name: 'Sprint 2', status: 'ACTIVE' },
      ]);

      const result = await service.findAll('proj-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return sprint with issues', async () => {
      prisma.sprint.findUnique.mockResolvedValue({
        id: 'sprint-1',
        name: 'Sprint 1',
        issues: [{ id: 'issue-1' }],
      });

      const result = await service.findOne('sprint-1');

      expect(result).toHaveProperty('name', 'Sprint 1');
    });

    it('should throw NotFoundException for non-existent sprint', async () => {
      prisma.sprint.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update sprint details', async () => {
      prisma.sprint.update.mockResolvedValue({
        id: 'sprint-1',
        name: 'Updated Sprint',
      });

      const result = await service.update('sprint-1', { name: 'Updated Sprint' });

      expect(result.name).toBe('Updated Sprint');
    });
  });

  describe('start', () => {
    it('should transition from PLANNING to ACTIVE', async () => {
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

      const result = await service.start('sprint-1');

      expect(result.status).toBe('ACTIVE');
    });

    it('should throw BadRequestException if sprint is not in PLANNING', async () => {
      prisma.sprint.findUnique.mockResolvedValue({
        id: 'sprint-1',
        status: 'ACTIVE',
        projectId: 'proj-1',
      });

      await expect(service.start('sprint-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if another sprint is already ACTIVE', async () => {
      prisma.sprint.findUnique.mockResolvedValue({
        id: 'sprint-1',
        status: 'PLANNING',
        projectId: 'proj-1',
      });
      prisma.sprint.findFirst.mockResolvedValue({
        id: 'sprint-2',
        status: 'ACTIVE',
      });

      await expect(service.start('sprint-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('complete', () => {
    it('should transition from ACTIVE to COMPLETED', async () => {
      prisma.sprint.findUnique.mockResolvedValue({
        id: 'sprint-1',
        status: 'ACTIVE',
      });
      prisma.sprint.update.mockResolvedValue({
        id: 'sprint-1',
        status: 'COMPLETED',
      });

      const result = await service.complete('sprint-1');

      expect(result.status).toBe('COMPLETED');
    });

    it('should throw BadRequestException if sprint is not ACTIVE', async () => {
      prisma.sprint.findUnique.mockResolvedValue({
        id: 'sprint-1',
        status: 'PLANNING',
      });

      await expect(service.complete('sprint-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getBacklog', () => {
    it('should return issues not assigned to any sprint', async () => {
      prisma.issue.findMany.mockResolvedValue([
        { id: 'issue-1', sprintId: null },
        { id: 'issue-2', sprintId: null },
      ]);

      const result = await service.getBacklog('proj-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('addIssueToSprint', () => {
    it('should assign issue to sprint', async () => {
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        sprintId: 'sprint-1',
      });

      const result = await service.addIssueToSprint('sprint-1', 'issue-1');

      expect(result.sprintId).toBe('sprint-1');
    });
  });

  describe('removeIssueFromSprint', () => {
    it('should unassign issue from sprint', async () => {
      prisma.issue.update.mockResolvedValue({
        id: 'issue-1',
        sprintId: null,
      });

      const result = await service.removeIssueFromSprint('sprint-1', 'issue-1');

      expect(result.sprintId).toBeNull();
    });
  });
});
