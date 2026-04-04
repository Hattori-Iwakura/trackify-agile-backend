import { Test, TestingModule } from '@nestjs/testing';
import { AdminModule } from './admin.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';

describe('AdminModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule, AdminModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should have AdminController', () => {
    expect(module.get(AdminController)).toBeDefined();
  });

  it('should have AdminService', () => {
    expect(module.get(AdminService)).toBeDefined();
  });
});
