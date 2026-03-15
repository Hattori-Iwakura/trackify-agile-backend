import { Test } from '@nestjs/testing';
import { IssuesModule } from './issues.module';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';

describe('IssuesModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [IssuesModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should have IssuesController defined', async () => {
    const module = await Test.createTestingModule({
      imports: [IssuesModule],
    }).compile();

    expect(module.get<IssuesController>(IssuesController)).toBeDefined();
  });

  it('should have IssuesService defined', async () => {
    const module = await Test.createTestingModule({
      imports: [IssuesModule],
    }).compile();

    expect(module.get<IssuesService>(IssuesService)).toBeDefined();
  });
});
