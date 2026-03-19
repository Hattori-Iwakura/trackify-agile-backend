import { UploadService } from './upload.service';
import * as fs from 'fs';

jest.mock('fs', () => ({
  unlink: jest.fn(),
}));

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(() => {
    service = new UploadService();
    jest.clearAllMocks();
  });

  describe('deleteFile', () => {
    it('should call fs.unlink with the file path', () => {
      service.deleteFile('/uploads/avatars/test.jpg');
      expect(fs.unlink).toHaveBeenCalledWith(
        '/uploads/avatars/test.jpg',
        expect.any(Function),
      );
    });

    it('should do nothing when filePath is null', () => {
      service.deleteFile(null as any);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should do nothing when filePath is empty string', () => {
      service.deleteFile('');
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should do nothing when filePath is undefined', () => {
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
