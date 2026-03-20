import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadService } from '../../upload/upload.service';
import { createMockPrismaService } from '../../../test/helpers/mock-prisma.helper';

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let uploadService: { deleteFile: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    uploadService = { deleteFile: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: uploadService },
      ],
    }).compile();

    service = module.get<AttachmentsService>(AttachmentsService);
  });

  describe('upload', () => {
    it('should create attachment record with file metadata', async () => {
      const file = {
        originalname: 'doc.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        path: '/uploads/attachments/doc.pdf',
      } as Express.Multer.File;

      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.attachment.create.mockResolvedValue({
        id: 'att-1',
        filename: 'doc.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        url: '/uploads/attachments/doc.pdf',
        issueId: 'issue-1',
        uploaderId: 'uuid-1',
      });

      const result = await service.upload('proj-1', 'TRK-1', 'uuid-1', file);

      expect(result).toHaveProperty('filename', 'doc.pdf');
      expect(result).toHaveProperty('mimeType', 'application/pdf');
      expect(result).toHaveProperty('size', 2048);
    });
  });

  describe('findAllForIssue', () => {
    it('should return all attachments for an issue', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'issue-1' });
      prisma.attachment.findMany.mockResolvedValue([
        { id: 'att-1', filename: 'file1.pdf' },
        { id: 'att-2', filename: 'file2.jpg' },
      ]);

      const result = await service.findAllForIssue('proj-1', 'TRK-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('should delete attachment when user is uploader', async () => {
      prisma.attachment.findUnique.mockResolvedValue({
        id: 'att-1',
        uploaderId: 'uuid-1',
        url: '/uploads/file.pdf',
      });
      prisma.attachment.delete.mockResolvedValue({});

      await expect(service.remove('att-1', 'uuid-1', 'MEMBER' as any)).resolves.not.toThrow();
      expect(uploadService.deleteFile).toHaveBeenCalledWith('/uploads/file.pdf');
    });

    it('should allow ADMIN to delete any attachment', async () => {
      prisma.attachment.findUnique.mockResolvedValue({
        id: 'att-1',
        uploaderId: 'other-user',
        url: '/uploads/file.pdf',
      });
      prisma.attachment.delete.mockResolvedValue({});

      await expect(service.remove('att-1', 'uuid-1', 'ADMIN' as any)).resolves.not.toThrow();
    });

    it('should throw NotFoundException for non-existent attachment', async () => {
      prisma.attachment.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('non-existent', 'uuid-1', 'MEMBER' as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not uploader and not ADMIN/OWNER', async () => {
      prisma.attachment.findUnique.mockResolvedValue({
        id: 'att-1',
        uploaderId: 'other-user',
      });

      await expect(
        service.remove('att-1', 'uuid-1', 'MEMBER' as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
