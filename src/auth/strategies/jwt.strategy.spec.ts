import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrismaService } from '../../../test/helpers/mock-prisma.helper';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should return user payload for valid token payload', async () => {
      const payload = {
        sub: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
      };
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
      });

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'USER',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = {
        sub: 'nonexistent',
        email: 'gone@example.com',
        role: 'USER',
      };
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
