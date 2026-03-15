import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAllForUser: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: service }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  describe('GET /notifications', () => {
    it('should return paginated notifications', async () => {
      service.findAllForUser.mockResolvedValue({
        data: [{ id: 'notif-1' }],
        meta: { total: 1 },
      });

      const result = await controller.findAll({ id: 'uuid-1' }, { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return unread count', async () => {
      service.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount({ id: 'uuid-1' });

      expect(result).toBe(5);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      service.markAsRead.mockResolvedValue({ id: 'notif-1', read: true });

      const result = await controller.markAsRead('notif-1', { id: 'uuid-1' });

      expect(result.read).toBe(true);
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      service.markAllAsRead.mockResolvedValue({ count: 3 });

      const result = await controller.markAllAsRead({ id: 'uuid-1' });

      expect(result).toHaveProperty('count', 3);
    });
  });
});
