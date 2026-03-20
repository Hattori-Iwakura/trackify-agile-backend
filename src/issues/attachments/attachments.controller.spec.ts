import { Test, TestingModule } from '@nestjs/testing';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { ProjectRoleGuard } from '../../projects/guards/project-role.guard';

describe('AttachmentsController', () => {
  let controller: AttachmentsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      upload: jest.fn(),
      findAllForIssue: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttachmentsController],
      providers: [{ provide: AttachmentsService, useValue: service }],
    })
      .overrideGuard(ProjectRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AttachmentsController>(AttachmentsController);
  });

  describe('POST .../attachments', () => {
    it('should upload file and return 201 with metadata', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        path: '/uploads/attachments/test.pdf',
      } as Express.Multer.File;

      service.upload.mockResolvedValue({
        id: 'att-1',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      });

      const result = await controller.upload('proj-1', 'TRK-1', { id: 'uuid-1' }, mockFile);

      expect(service.upload).toHaveBeenCalledWith('proj-1', 'TRK-1', 'uuid-1', mockFile);
      expect(result).toHaveProperty('filename', 'test.pdf');
    });
  });

  describe('GET .../attachments', () => {
    it('should return list of attachments', async () => {
      service.findAllForIssue.mockResolvedValue([{ id: 'att-1' }]);

      const result = await controller.findAll('proj-1', 'TRK-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('DELETE .../attachments/:id', () => {
    it('should delete attachment', async () => {
      service.remove.mockResolvedValue(undefined);
      const req = { projectMember: { role: 'MEMBER' } };

      await expect(
        controller.remove('att-1', { id: 'uuid-1' }, req),
      ).resolves.not.toThrow();
    });
  });
});
