import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers/mock-prisma.helper';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('create', () => {
    it('should create project and assign creator as OWNER', async () => {
      const project = {
        id: 'proj-1',
        name: 'Test Project',
        key: 'TP',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const member = {
        id: 'pm-1',
        userId: 'user-1',
        projectId: 'proj-1',
        role: 'OWNER',
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        prisma.project.create.mockResolvedValue(project);
        prisma.projectMember.create.mockResolvedValue(member);
        return cb(prisma);
      });

      const result = await service.create(
        { name: 'Test Project', key: 'TP' },
        'user-1',
      );

      expect(result).toEqual({ ...project, members: [member] });
    });

    it('should throw ConflictException for duplicate key (P2002)', async () => {
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      prisma.$transaction.mockRejectedValue(prismaError);

      await expect(
        service.create({ name: 'Test', key: 'TP' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated projects for user', async () => {
      const projects = [
        { id: 'proj-1', name: 'Project 1', key: 'P1', _count: { members: 3 } },
      ];
      prisma.project.findMany.mockResolvedValue(projects);
      prisma.project.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', { page: 1, limit: 20 });

      expect(result.data).toEqual(projects);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { members: { some: { userId: 'user-1' } } },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should calculate correct pagination offset', async () => {
      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      await service.findAll('user-1', { page: 3, limit: 10 });

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('findOne', () => {
    it('should return project with member and label counts', async () => {
      const project = {
        id: 'proj-1',
        name: 'Test',
        key: 'TP',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { members: 2, labels: 5 },
      };
      prisma.project.findUnique.mockResolvedValue(project);

      const result = await service.findOne('proj-1');

      expect(result).toEqual(project);
      expect(prisma.project.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'proj-1' },
        }),
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update project name and description', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      const updated = {
        id: 'proj-1',
        name: 'Updated',
        description: 'New desc',
        key: 'TP',
      };
      prisma.project.update.mockResolvedValue(updated);

      const result = await service.update('proj-1', {
        name: 'Updated',
        description: 'New desc',
      });

      expect(result).toEqual(updated);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { name: 'Updated', description: 'New desc' },
      });
    });

    it('should throw NotFoundException for nonexistent project', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete project', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      prisma.project.delete.mockResolvedValue({ id: 'proj-1' });

      await service.delete('proj-1');

      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
      });
    });

    it('should throw NotFoundException for nonexistent project', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
