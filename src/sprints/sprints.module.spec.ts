import { Test } from '@nestjs/testing';
import { SprintsModule } from './sprints.module';
import { SprintsController } from './sprints.controller';
import { SprintsService } from './sprints.service';

describe('SprintsModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [SprintsModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should have SprintsController defined', async () => {
    const module = await Test.createTestingModule({
      imports: [SprintsModule],
    }).compile();

    expect(module.get<SprintsController>(SprintsController)).toBeDefined();
  });

  it('should have SprintsService defined', async () => {
    const module = await Test.createTestingModule({
      imports: [SprintsModule],
    }).compile();

    expect(module.get<SprintsService>(SprintsService)).toBeDefined();
  });
});
