import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { createMockPrismaService } from './mock-prisma.helper';

export async function createE2EAppWithWS(port: number) {
  const mockPrisma = createMockPrismaService();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(mockPrisma)
    .compile();

  const app: INestApplication = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Must call listen() (not init()) so the underlying HTTP server starts.
  // Socket.io attaches to this HTTP server — without it WS connections are refused.
  await app.listen(port);

  return { app, prisma: mockPrisma, moduleRef: moduleFixture };
}
