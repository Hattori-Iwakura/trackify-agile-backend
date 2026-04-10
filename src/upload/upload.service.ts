import { Injectable, Logger } from '@nestjs/common';
import { unlink } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  /**
   * Delete a file given its URL path (e.g. `/uploads/attachments/uuid.jpg`).
   * Resolves the URL to the actual filesystem path using UPLOAD_DIR.
   */
  deleteFile(fileUrl: string): void {
    if (!fileUrl) {
      return;
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    // Strip the `/uploads/` prefix to get the relative sub-path (e.g. `attachments/uuid.jpg`)
    const relativePath = fileUrl.replace(/^\/?uploads\//, '');
    const absolutePath = join(uploadDir, relativePath);

    unlink(absolutePath, (err) => {
      if (err) {
        this.logger.error(`Failed to delete file: ${absolutePath}`, err.message);
      }
    });
  }
}
