import { Test } from '@nestjs/testing';
import { ProjectsModule } from './projects.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaModule } from '../prisma/prisma.module';

describe('ProjectsModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, ProjectsModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should have ProjectsController defined', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, ProjectsModule],
    }).compile();

    expect(module.get<ProjectsController>(ProjectsController)).toBeDefined();
  });

  it('should have ProjectsService defined', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, ProjectsModule],
    }).compile();

    expect(module.get<ProjectsService>(ProjectsService)).toBeDefined();
  });
});
