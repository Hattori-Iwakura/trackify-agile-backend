import { Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SprintsModule } from './sprints.module';
import { SprintsController } from './sprints.controller';
import { SprintsService } from './sprints.service';
import { PrismaModule } from '../prisma/prisma.module';

describe('SprintsModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, EventEmitterModule.forRoot(), SprintsModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should have SprintsController defined', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, EventEmitterModule.forRoot(), SprintsModule],
    }).compile();

    expect(module.get<SprintsController>(SprintsController)).toBeDefined();
  });

  it('should have SprintsService defined', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, EventEmitterModule.forRoot(), SprintsModule],
    }).compile();

    expect(module.get<SprintsService>(SprintsService)).toBeDefined();
  });
});
