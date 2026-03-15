import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrismaService } from '../../../test/helpers/mock-prisma.helper';

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AttachmentsService>(AttachmentsService);
  });

  describe('upload', () => {
    it('should create attachment record with file metadata', async () => {
      const file = {
        filename: 'doc.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        path: '/uploads/doc.pdf',
      } as Express.Multer.File;

      prisma.attachment.create.mockResolvedValue({
        id: 'att-1',
        filename: 'doc.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        url: '/uploads/doc.pdf',
        issueId: 'issue-1',
        uploaderId: 'uuid-1',
      });

      const result = await service.upload('issue-1', 'uuid-1', file);

      expect(result).toHaveProperty('filename', 'doc.pdf');
      expect(result).toHaveProperty('mimeType', 'application/pdf');
      expect(result).toHaveProperty('size', 2048);
    });
  });

  describe('findAllForIssue', () => {
    it('should return all attachments for an issue', async () => {
      prisma.attachment.findMany.mockResolvedValue([
        { id: 'att-1', filename: 'file1.pdf' },
        { id: 'att-2', filename: 'file2.jpg' },
      ]);

      const result = await service.findAllForIssue('issue-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('should delete attachment record', async () => {
      prisma.attachment.findUnique.mockResolvedValue({
        id: 'att-1',
        uploaderId: 'uuid-1',
        url: '/uploads/file.pdf',
      });
      prisma.attachment.delete.mockResolvedValue({});

      await expect(service.remove('att-1', 'uuid-1')).resolves.not.toThrow();
    });

    it('should throw NotFoundException for non-existent attachment', async () => {
      prisma.attachment.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent', 'uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not uploader', async () => {
      prisma.attachment.findUnique.mockResolvedValue({
        id: 'att-1',
        uploaderId: 'other-user',
      });

      await expect(service.remove('att-1', 'uuid-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
