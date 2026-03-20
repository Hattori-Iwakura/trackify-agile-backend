import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ErrorCode } from '../common/constants/error-codes';

const DEFAULT_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function createMulterOptions(
  subDir: string,
  allowedMimeTypes: string[] = DEFAULT_ALLOWED_MIME_TYPES,
): MulterOptions {
  const mimeTypeSet = new Set(allowedMimeTypes);
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const destination = join(uploadDir, subDir);

  mkdirSync(destination, { recursive: true });

  const maxFileSize = process.env.MAX_FILE_SIZE
    ? Number(process.env.MAX_FILE_SIZE)
    : 5 * 1024 * 1024;

  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, destination);
      },
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const filename = `${randomUUID()}${ext}`;
        cb(null, filename);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!mimeTypeSet.has(file.mimetype)) {
        return cb(
          new BadRequestException(ErrorCode.FILE_TYPE_NOT_ALLOWED),
          false,
        );
      }
      cb(null, true);
    },
    limits: {
      fileSize: maxFileSize,
    },
  };
}
