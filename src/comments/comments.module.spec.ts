import { Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommentsModule } from './comments.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PrismaModule } from '../prisma/prisma.module';

describe('CommentsModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, EventEmitterModule.forRoot(), CommentsModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should have CommentsController defined', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, EventEmitterModule.forRoot(), CommentsModule],
    }).compile();

    expect(module.get<CommentsController>(CommentsController)).toBeDefined();
  });

  it('should have CommentsService defined', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, EventEmitterModule.forRoot(), CommentsModule],
    }).compile();

    expect(module.get<CommentsService>(CommentsService)).toBeDefined();
  });
});
