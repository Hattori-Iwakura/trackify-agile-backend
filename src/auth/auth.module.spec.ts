import { Test } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should have AuthController defined', async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    const controller = module.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
  });

  it('should have AuthService defined', async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    const service = module.get<AuthService>(AuthService);
    expect(service).toBeDefined();
  });
});
