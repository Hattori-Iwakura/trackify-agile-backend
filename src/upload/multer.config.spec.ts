import { BadRequestException } from '@nestjs/common';
import { createMulterOptions } from './multer.config';
import * as fs from 'fs';

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
}));

jest.mock('multer', () => ({
  diskStorage: jest.fn((opts) => ({
    _destination: opts.destination,
    _filename: opts.filename,
  })),
}));

describe('createMulterOptions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.UPLOAD_DIR;
    delete process.env.MAX_FILE_SIZE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should create directory with recursive option', () => {
    createMulterOptions('avatars');
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('avatars'),
      { recursive: true },
    );
  });

  it('should use default ./uploads when UPLOAD_DIR is not set', () => {
    createMulterOptions('avatars');
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('uploads'),
      { recursive: true },
    );
  });

  it('should use UPLOAD_DIR env var when set', () => {
    process.env.UPLOAD_DIR = '/custom/uploads';
    createMulterOptions('avatars');
    const calledPath = (fs.mkdirSync as jest.Mock).mock.calls[0][0];
    expect(calledPath).toContain('custom');
    expect(calledPath).toContain('uploads');
    expect(calledPath).toContain('avatars');
  });

  it('should set file size limit from MAX_FILE_SIZE env', () => {
    process.env.MAX_FILE_SIZE = '1048576';
    const options = createMulterOptions('avatars');
    expect(options.limits).toEqual({ fileSize: 1048576 });
  });

  it('should default file size limit to 5MB', () => {
    const options = createMulterOptions('avatars');
    expect(options.limits).toEqual({ fileSize: 5 * 1024 * 1024 });
  });

  describe('fileFilter', () => {
    it('should accept image/jpeg', () => {
      const options = createMulterOptions('avatars');
      const cb = jest.fn();
      options.fileFilter!({} as any, { mimetype: 'image/jpeg' } as any, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept image/png', () => {
      const options = createMulterOptions('avatars');
      const cb = jest.fn();
      options.fileFilter!({} as any, { mimetype: 'image/png' } as any, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept image/webp', () => {
      const options = createMulterOptions('avatars');
      const cb = jest.fn();
      options.fileFilter!({} as any, { mimetype: 'image/webp' } as any, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject text/plain with BadRequestException', () => {
      const options = createMulterOptions('avatars');
      const cb = jest.fn();
      options.fileFilter!({} as any, { mimetype: 'text/plain' } as any, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
    });

    it('should reject application/pdf with BadRequestException', () => {
      const options = createMulterOptions('avatars');
      const cb = jest.fn();
      options.fileFilter!(
        {} as any,
        { mimetype: 'application/pdf' } as any,
        cb,
      );
      expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
    });
  });

  describe('storage callbacks', () => {
    it('should set destination callback that returns the computed path', () => {
      const options = createMulterOptions('avatars');
      const storage = options.storage;
      const cb = jest.fn();
      storage._destination({} as any, {} as any, cb);
      expect(cb).toHaveBeenCalledWith(null, expect.stringContaining('avatars'));
    });

    it('should generate UUID-based filename with lowercase extension', () => {
      const options = createMulterOptions('avatars');
      const storage = options.storage;
      const cb = jest.fn();
      storage._filename({} as any, { originalname: 'Photo.JPG' } as any, cb);
      expect(cb).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/^[0-9a-f-]+\.jpg$/),
      );
    });

    it('should handle filenames without extension', () => {
      const options = createMulterOptions('avatars');
      const storage = options.storage;
      const cb = jest.fn();
      storage._filename({} as any, { originalname: 'noext' } as any, cb);
      expect(cb).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/^[0-9a-f-]+$/),
      );
    });
  });
});
