import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
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
    const createDto = { name: 'My Project', key: 'MP', description: 'Test' };
    const userId = 'uuid-1';

    it('should create project and add creator as OWNER member', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue({
        id: 'proj-1',
        ...createDto,
        key: 'MP',
      });
      prisma.projectMember.create.mockResolvedValue({
        userId,
        projectId: 'proj-1',
        role: 'OWNER',
      });

      const result = await service.create(createDto, userId);

      expect(prisma.project.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should generate project key in uppercase', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue({
        id: 'proj-1',
        ...createDto,
        key: 'MP',
      });
      prisma.projectMember.create.mockResolvedValue({});

      await service.create({ ...createDto, key: 'mp' }, userId);

      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ key: 'MP' }),
        }),
      );
    });

    it('should throw ConflictException for duplicate key', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated projects for user', async () => {
      prisma.project.findMany.mockResolvedValue([
        { id: 'proj-1', name: 'Project 1' },
      ]);
      prisma.project.count.mockResolvedValue(1);

      const result = await service.findAll('uuid-1', { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });

    it('should only return projects where user is a member', async () => {
      await service.findAll('uuid-1', { page: 1, limit: 20 });

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            members: expect.objectContaining({
              some: { userId: 'uuid-1' },
            }),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return project with members', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test',
        members: [],
      });

      const result = await service.findOne('proj-1');

      expect(result).toHaveProperty('id', 'proj-1');
    });

    it('should throw NotFoundException for non-existent project', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update project fields', async () => {
      prisma.project.update.mockResolvedValue({
        id: 'proj-1',
        name: 'Updated',
      });

      const result = await service.update('proj-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete project', async () => {
      prisma.project.delete.mockResolvedValue({ id: 'proj-1' });

      await expect(service.remove('proj-1')).resolves.not.toThrow();
    });
  });

  describe('addMember', () => {
    it('should add user as project member with role', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(null);
      prisma.projectMember.create.mockResolvedValue({
        userId: 'uuid-2',
        projectId: 'proj-1',
        role: 'MEMBER',
      });

      const result = await service.addMember('proj-1', 'uuid-2', 'MEMBER');

      expect(result.role).toBe('MEMBER');
    });

    it('should throw ConflictException if user is already a member', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.addMember('proj-1', 'uuid-2', 'MEMBER'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeMember', () => {
    it('should remove member from project', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({
        userId: 'uuid-2',
        role: 'MEMBER',
      });
      prisma.projectMember.delete.mockResolvedValue({});

      await expect(
        service.removeMember('proj-1', 'uuid-2'),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException if removing OWNER', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({
        userId: 'uuid-1',
        role: 'OWNER',
      });

      await expect(
        service.removeMember('proj-1', 'uuid-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      prisma.projectMember.update.mockResolvedValue({
        userId: 'uuid-2',
        role: 'ADMIN',
      });

      const result = await service.updateMemberRole('proj-1', 'uuid-2', 'ADMIN');

      expect(result.role).toBe('ADMIN');
    });
  });
});
