import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers/mock-prisma.helper';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('create', () => {
    it('should create notification record', async () => {
      prisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        type: 'ISSUE_ASSIGNED',
        message: 'You were assigned TRK-1',
        userId: 'uuid-1',
        read: false,
      });

      const result = await service.create({
        type: 'ISSUE_ASSIGNED',
        message: 'You were assigned TRK-1',
        userId: 'uuid-1',
      });

      expect(result).toHaveProperty('type', 'ISSUE_ASSIGNED');
      expect(result.read).toBe(false);
    });
  });

  describe('findAllForUser', () => {
    it('should return paginated notifications in descending order', async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: 'notif-2', createdAt: new Date('2026-03-15') },
        { id: 'notif-1', createdAt: new Date('2026-03-14') },
      ]);
      prisma.notification.count.mockResolvedValue(2);

      const result = await service.findAllForUser('uuid-1', { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(2);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'uuid-1',
        read: false,
      });
      prisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        read: true,
      });

      const result = await service.markAsRead('notif-1', 'uuid-1');

      expect(result.read).toBe(true);
    });

    it('should throw NotFoundException for non-existent notification', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('non-existent', 'uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('uuid-1');

      expect(result).toHaveProperty('count', 5);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'uuid-1', read: false }),
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('uuid-1');

      expect(result).toBe(3);
      expect(prisma.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'uuid-1', read: false }),
        }),
      );
    });
  });
});
