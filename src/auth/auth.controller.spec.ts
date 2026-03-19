import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refreshToken: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /auth/register', () => {
    it('should call authService.register and return result', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password1!',
        fullName: 'Test',
      };
      const expected = {
        id: 'uuid-1',
        email: dto.email,
        fullName: dto.fullName,
      };
      authService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /auth/login', () => {
    it('should call authService.login and return tokens', async () => {
      const dto = { email: 'test@example.com', password: 'Password1!' };
      const tokens = { accessToken: 'at', refreshToken: 'rt' };
      authService.login.mockResolvedValue(tokens);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(tokens);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new access token', async () => {
      const expected = { accessToken: 'new-at' };
      authService.refreshToken.mockResolvedValue(expected);

      const result = await controller.refresh({ refreshToken: 'valid-rt' });

      expect(result).toEqual(expected);
    });
  });

  describe('POST /auth/logout', () => {
    it('should call authService.logout', async () => {
      authService.logout.mockResolvedValue(undefined);

      const mockUser = {
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
      };
      await controller.logout(mockUser);

      expect(authService.logout).toHaveBeenCalledWith('uuid-1');
    });
  });
});
