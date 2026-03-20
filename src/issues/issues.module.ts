import { Module } from '@nestjs/common';
import { UploadModule } from '../upload/upload.module';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { AttachmentsController } from './attachments/attachments.controller';
import { AttachmentsService } from './attachments/attachments.service';

@Module({
  imports: [UploadModule],
  controllers: [IssuesController, AttachmentsController],
  providers: [IssuesService, AttachmentsService],
  exports: [IssuesService],
})
export class IssuesModule {}
