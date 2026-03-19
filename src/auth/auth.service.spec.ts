import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers/mock-prisma.helper';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let jwtService: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    jwtService = { sign: jest.fn(), verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password1!',
      fullName: 'Test User',
    };

    it('should hash password and create user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        email: registerDto.email,
        fullName: registerDto.fullName,
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register(registerDto);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(registerDto.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should return user object without password field', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        email: registerDto.email,
        fullName: registerDto.fullName,
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register(registerDto);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('hashedRefreshToken');
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'Password1!' };

    it('should return access token and refresh token for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: loginDto.email,
        password: '$2b$10$hashedpassword',
        fullName: 'Test User',
        role: 'USER',
      });
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue(
        'hashed-refresh-token',
      );
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      prisma.user.update.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should store hashed refresh token in database', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: loginDto.email,
        password: '$2b$10$hashedpassword',
        fullName: 'Test User',
        role: 'USER',
      });
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue(
        'hashed-refresh-token',
      );
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      prisma.user.update.mockResolvedValue({});

      await service.login(loginDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { hashedRefreshToken: 'hashed-refresh-token' },
      });
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: loginDto.email,
        password: '$2b$10$differenthash',
        fullName: 'Test User',
        role: 'USER',
      });
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should return new access token for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
        hashedRefreshToken: '$2b$10$hashedrefreshtoken',
      });
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user has logged out (no stored token)', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
        hashedRefreshToken: null,
      });

      await expect(service.refreshToken('some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token hash does not match', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
        hashedRefreshToken: '$2b$10$hashedrefreshtoken',
      });
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshToken('wrong-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should set hashedRefreshToken to null', async () => {
      prisma.user.update.mockResolvedValue({});

      await service.logout('uuid-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { hashedRefreshToken: null },
      });
    });
  });
});
