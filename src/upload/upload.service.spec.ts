import { UploadService } from './upload.service';
import * as fs from 'fs';
import { join } from 'node:path';

jest.mock('fs', () => ({
  unlink: jest.fn(),
}));

describe('UploadService', () => {
  let service: UploadService;
  const originalEnv = process.env;

  beforeEach(() => {
    service = new UploadService();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('deleteFile', () => {
    it('should resolve URL to filesystem path and call unlink', () => {
      service.deleteFile('/uploads/avatars/test.jpg');
      expect(fs.unlink).toHaveBeenCalledWith(
        join('./uploads', 'avatars/test.jpg'),
        expect.any(Function),
      );
    });

    it('should use custom UPLOAD_DIR when set', () => {
      process.env.UPLOAD_DIR = './uploads';
      service.deleteFile('/uploads/attachments/doc.pdf');
      expect(fs.unlink).toHaveBeenCalledWith(
        join('./uploads', 'attachments/doc.pdf'),
        expect.any(Function),
      );
    });

    it('should do nothing when fileUrl is null', () => {
      service.deleteFile(null as any);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should do nothing when fileUrl is empty string', () => {
      service.deleteFile('');
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should do nothing when fileUrl is undefined', () => {
      service.deleteFile(undefined as any);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should log error when unlink fails', () => {
      const mockUnlink = fs.unlink as unknown as jest.Mock;
      mockUnlink.mockImplementation((_path, cb) => {
        cb(new Error('ENOENT: no such file'));
      });

      // Should not throw
      service.deleteFile('/uploads/avatars/missing.jpg');
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should not log error when unlink succeeds', () => {
      const mockUnlink = fs.unlink as unknown as jest.Mock;
      mockUnlink.mockImplementation((_path, cb) => {
        cb(null);
      });

      service.deleteFile('/uploads/avatars/existing.jpg');
      expect(mockUnlink).toHaveBeenCalled();
    });
  });
});
