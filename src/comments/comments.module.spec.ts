import { Test } from '@nestjs/testing';
import { CommentsModule } from './comments.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

describe('CommentsModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [CommentsModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should have CommentsController defined', async () => {
    const module = await Test.createTestingModule({
      imports: [CommentsModule],
    }).compile();

    expect(module.get<CommentsController>(CommentsController)).toBeDefined();
  });

  it('should have CommentsService defined', async () => {
    const module = await Test.createTestingModule({
      imports: [CommentsModule],
    }).compile();

    expect(module.get<CommentsService>(CommentsService)).toBeDefined();
  });
});
