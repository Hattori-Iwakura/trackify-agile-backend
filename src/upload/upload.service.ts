import { Injectable, Logger } from '@nestjs/common';
import { unlink } from 'node:fs';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  deleteFile(filePath: string): void {
    if (!filePath) {
      return;
    }

    unlink(filePath, (err) => {
      if (err) {
        this.logger.error(`Failed to delete file: ${filePath}`, err.message);
      }
    });
  }
}
