import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    findById: jest.Mock;
    updateProfile: jest.Mock;
    updateAvatar: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      findById: jest.fn(),
      updateProfile: jest.fn(),
      updateAvatar: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      const user = {
        id: 'uuid-1',
        email: 'test@example.com',
        fullName: 'Test',
      };
      usersService.findById.mockResolvedValue(user);

      const result = await controller.getMe({ id: 'uuid-1' });

      expect(usersService.findById).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(user);
    });
  });

  describe('PATCH /users/me', () => {
    it('should update profile with validated data', async () => {
      const updated = { id: 'uuid-1', fullName: 'Updated' };
      usersService.updateProfile.mockResolvedValue(updated);

      const result = await controller.updateMe(
        { id: 'uuid-1' },
        { fullName: 'Updated' },
      );

      expect(usersService.updateProfile).toHaveBeenCalledWith('uuid-1', {
        fullName: 'Updated',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('POST /users/me/avatar', () => {
    it('should accept file upload and return updated user', async () => {
      const mockFile = {
        filename: 'a1b2c3d4.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        path: './uploads/avatars/a1b2c3d4.jpg',
      } as Express.Multer.File;

      usersService.updateAvatar.mockResolvedValue({
        id: 'uuid-1',
        avatarUrl: '/uploads/avatars/a1b2c3d4.jpg',
      });

      const result = await controller.uploadAvatar({ id: 'uuid-1' }, mockFile);

      expect(usersService.updateAvatar).toHaveBeenCalledWith(
        'uuid-1',
        '/uploads/avatars/a1b2c3d4.jpg',
      );
      expect(result.avatarUrl).toBe('/uploads/avatars/a1b2c3d4.jpg');
    });

    it('should throw BadRequestException when no file is attached', async () => {
      await expect(
        controller.uploadAvatar({ id: 'uuid-1' }, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
