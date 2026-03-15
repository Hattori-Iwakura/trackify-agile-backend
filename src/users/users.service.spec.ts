import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers/mock-prisma.helper';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('should return user without password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: null,
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findById('uuid-1');

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user fields', async () => {
      const updated = {
        id: 'uuid-1',
        email: 'test@example.com',
        fullName: 'Updated Name',
        avatarUrl: null,
        role: 'USER',
      };
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile('uuid-1', { fullName: 'Updated Name' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-1' },
        }),
      );
      expect(result.fullName).toBe('Updated Name');
    });

    it('should not allow changing email to an existing email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'other-user' });

      await expect(
        service.updateProfile('uuid-1', { email: 'taken@example.com' }),
      ).rejects.toThrow();
    });
  });

  describe('updateAvatar', () => {
    it('should update avatarUrl field', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'uuid-1',
        avatarUrl: '/uploads/avatar-123.jpg',
      });

      const result = await service.updateAvatar('uuid-1', '/uploads/avatar-123.jpg');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-1' },
          data: expect.objectContaining({ avatarUrl: '/uploads/avatar-123.jpg' }),
        }),
      );
      expect(result.avatarUrl).toBe('/uploads/avatar-123.jpg');
    });
  });
});
