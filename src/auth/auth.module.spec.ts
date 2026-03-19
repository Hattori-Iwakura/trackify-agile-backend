import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers/mock-prisma.helper';

describe('AuthModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret',
              JWT_REFRESH_SECRET: 'test-refresh-secret',
            }),
          ],
        }),
        PrismaModule,
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(createMockPrismaService())
      .compile();

    expect(module).toBeDefined();
  });

  it('should have AuthController defined', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret',
              JWT_REFRESH_SECRET: 'test-refresh-secret',
            }),
          ],
        }),
        PrismaModule,
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(createMockPrismaService())
      .compile();

    const controller = module.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
  });

  it('should have AuthService defined', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret',
              JWT_REFRESH_SECRET: 'test-refresh-secret',
            }),
          ],
        }),
        PrismaModule,
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(createMockPrismaService())
      .compile();

    const service = module.get<AuthService>(AuthService);
    expect(service).toBeDefined();
  });
});
