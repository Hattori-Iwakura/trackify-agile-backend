import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers/mock-prisma.helper';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('findAllUsers', () => {
    it('should return paginated users', async () => {
      const users = [
        { id: 'u1', email: 'a@test.com', fullName: 'A', role: 'USER', _count: { projectMembers: 2 } },
      ];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAllUsers({ page: 1, limit: 20 });

      expect(result.data).toEqual(users);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should calculate correct skip offset', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAllUsers({ page: 3, limit: 10 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('getSystemStats', () => {
    it('should return aggregated system stats', async () => {
      prisma.user.count.mockResolvedValue(10);
      prisma.project.count.mockResolvedValue(3);
      prisma.issue.count.mockResolvedValue(50);
      prisma.sprint.count.mockResolvedValue(5);
      prisma.comment.count.mockResolvedValue(20);
      prisma.issue.groupBy = jest.fn().mockResolvedValue([
        { status: 'TODO', _count: 15 },
        { status: 'DONE', _count: 30 },
      ]);

      const result = await service.getSystemStats();

      expect(result.users).toBe(10);
      expect(result.projects).toBe(3);
      expect(result.issues).toBe(50);
      expect(result.issuesByStatus).toHaveLength(2);
    });
  });

  describe('updateUserRole', () => {
    it('should update the user role', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'target-id' });
      prisma.user.update.mockResolvedValue({
        id: 'target-id',
        email: 'user@test.com',
        role: 'ADMIN',
      });

      const result = await service.updateUserRole(
        'target-id',
        { role: 'ADMIN' },
        'admin-id',
      );

      expect(result.role).toBe('ADMIN');
    });

    it('should throw ForbiddenException when changing own role', async () => {
      await expect(
        service.updateUserRole('admin-id', { role: 'USER' }, 'admin-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserRole('missing-id', { role: 'ADMIN' }, 'admin-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete the user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'target-id' });
      prisma.user.delete.mockResolvedValue({});

      await service.deleteUser('target-id', 'admin-id');

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'target-id' },
      });
    });

    it('should throw ForbiddenException when deleting self', async () => {
      await expect(
        service.deleteUser('admin-id', 'admin-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteUser('missing-id', 'admin-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
