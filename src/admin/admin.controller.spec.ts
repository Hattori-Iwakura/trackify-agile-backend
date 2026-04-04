import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Reflector } from '@nestjs/core';

describe('AdminController', () => {
  let controller: AdminController;
  let service: jest.Mocked<AdminService>;

  beforeEach(async () => {
    const mockService = {
      findAllUsers: jest.fn(),
      getSystemStats: jest.fn(),
      updateUserRole: jest.fn(),
      deleteUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockService },
        Reflector,
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get(AdminService) as jest.Mocked<AdminService>;
  });

  describe('GET /admin/users', () => {
    it('should return paginated users', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.findAllUsers.mockResolvedValue(result);

      expect(await controller.findAllUsers({ page: 1, limit: 20 })).toEqual(result);
      expect(service.findAllUsers).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });

  describe('GET /admin/stats', () => {
    it('should return system stats', async () => {
      const stats = { users: 5, projects: 2, issues: 10, sprints: 1, comments: 3, issuesByStatus: [] };
      service.getSystemStats.mockResolvedValue(stats);

      expect(await controller.getStats()).toEqual(stats);
    });
  });

  describe('PATCH /admin/users/:userId/role', () => {
    it('should update user role', async () => {
      const updated = { id: 'u1', email: 'test@test.com', role: 'ADMIN' };
      service.updateUserRole.mockResolvedValue(updated as any);

      const result = await controller.updateUserRole(
        'u1',
        { role: 'ADMIN' },
        { id: 'admin-1' },
      );

      expect(result).toEqual(updated);
      expect(service.updateUserRole).toHaveBeenCalledWith('u1', { role: 'ADMIN' }, 'admin-1');
    });
  });

  describe('DELETE /admin/users/:userId', () => {
    it('should delete user', async () => {
      service.deleteUser.mockResolvedValue(undefined);

      await controller.deleteUser('u1', { id: 'admin-1' });

      expect(service.deleteUser).toHaveBeenCalledWith('u1', 'admin-1');
    });
  });
});
