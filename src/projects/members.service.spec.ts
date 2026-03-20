import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers/mock-prisma.helper';
import { ProjectRole } from '../../generated/prisma/enums';

describe('MembersService', () => {
  let service: MembersService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  describe('addMember', () => {
    it('should add a member to the project', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.projectMember.findUnique.mockResolvedValue(null);
      const member = {
        id: 'pm-1',
        userId: 'user-2',
        projectId: 'proj-1',
        role: ProjectRole.MEMBER,
      };
      prisma.projectMember.create.mockResolvedValue(member);

      const result = await service.addMember(
        'proj-1',
        { userId: 'user-2', role: ProjectRole.MEMBER },
        ProjectRole.OWNER,
      );

      expect(result).toEqual(member);
    });

    it('should throw ConflictException if user is already a member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.projectMember.findUnique.mockResolvedValue({ id: 'pm-1' });

      await expect(
        service.addMember(
          'proj-1',
          { userId: 'user-2', role: ProjectRole.MEMBER },
          ProjectRole.OWNER,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(
          'proj-1',
          { userId: 'nonexistent', role: ProjectRole.MEMBER },
          ProjectRole.OWNER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when ADMIN tries to assign ADMIN role', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(
          'proj-1',
          { userId: 'user-2', role: ProjectRole.ADMIN },
          ProjectRole.ADMIN,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow OWNER to assign ADMIN role', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.projectMember.findUnique.mockResolvedValue(null);
      prisma.projectMember.create.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-2',
        projectId: 'proj-1',
        role: ProjectRole.ADMIN,
      });

      const result = await service.addMember(
        'proj-1',
        { userId: 'user-2', role: ProjectRole.ADMIN },
        ProjectRole.OWNER,
      );

      expect(result.role).toBe(ProjectRole.ADMIN);
    });
  });

  describe('findAll', () => {
    it('should return paginated members with user info', async () => {
      const members = [
        {
          id: 'pm-1',
          userId: 'user-1',
          role: ProjectRole.OWNER,
          user: { id: 'user-1', fullName: 'Owner', email: 'o@test.com', avatarUrl: null },
        },
      ];
      prisma.projectMember.findMany.mockResolvedValue(members);
      prisma.projectMember.count.mockResolvedValue(1);

      const result = await service.findAll('proj-1', { page: 1, limit: 20 });

      expect(result.data).toEqual(members);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('updateRole', () => {
    it('should update member role', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-2',
        projectId: 'proj-1',
        role: ProjectRole.MEMBER,
      });
      prisma.projectMember.update.mockResolvedValue({
        id: 'pm-1',
        role: ProjectRole.ADMIN,
      });

      const result = await service.updateRole(
        'proj-1',
        'user-2',
        { role: ProjectRole.ADMIN },
        ProjectRole.OWNER,
      );

      expect(result.role).toBe(ProjectRole.ADMIN);
    });

    it('should throw NotFoundException if member not found', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRole('proj-1', 'nonexistent', { role: ProjectRole.ADMIN }, ProjectRole.OWNER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce last-owner rule when demoting from OWNER', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-1',
        projectId: 'proj-1',
        role: ProjectRole.OWNER,
      });
      prisma.projectMember.count.mockResolvedValue(1);

      await expect(
        service.updateRole('proj-1', 'user-1', { role: ProjectRole.ADMIN }, ProjectRole.OWNER),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when ADMIN tries to promote to OWNER', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-2',
        projectId: 'proj-1',
        role: ProjectRole.MEMBER,
      });

      await expect(
        service.updateRole('proj-1', 'user-2', { role: ProjectRole.OWNER }, ProjectRole.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-2',
        projectId: 'proj-1',
        role: ProjectRole.MEMBER,
      });
      prisma.projectMember.delete.mockResolvedValue({});

      await service.removeMember('proj-1', 'user-2', ProjectRole.OWNER);

      expect(prisma.projectMember.delete).toHaveBeenCalledWith({
        where: { userId_projectId: { userId: 'user-2', projectId: 'proj-1' } },
      });
    });

    it('should throw NotFoundException if member not found', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember('proj-1', 'nonexistent', ProjectRole.OWNER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce last-owner rule when removing an OWNER', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-1',
        projectId: 'proj-1',
        role: ProjectRole.OWNER,
      });
      prisma.projectMember.count.mockResolvedValue(1);

      await expect(
        service.removeMember('proj-1', 'user-1', ProjectRole.OWNER),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when ADMIN tries to remove OWNER', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-1',
        projectId: 'proj-1',
        role: ProjectRole.OWNER,
      });

      await expect(
        service.removeMember('proj-1', 'user-1', ProjectRole.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('leave', () => {
    it('should let a member leave the project', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-2',
        projectId: 'proj-1',
        role: ProjectRole.MEMBER,
      });
      prisma.projectMember.delete.mockResolvedValue({});

      await service.leave('proj-1', 'user-2');

      expect(prisma.projectMember.delete).toHaveBeenCalled();
    });

    it('should enforce last-owner rule when OWNER tries to leave', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-1',
        projectId: 'proj-1',
        role: ProjectRole.OWNER,
      });
      prisma.projectMember.count.mockResolvedValue(1);

      await expect(
        service.leave('proj-1', 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
