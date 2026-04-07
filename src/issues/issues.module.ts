import { Module } from '@nestjs/common';
import { UploadModule } from '../upload/upload.module';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { AttachmentsController } from './attachments/attachments.controller';
import { AttachmentsService } from './attachments/attachments.service';
import { IssueHistoryController } from './history/issue-history.controller';
import { IssueHistoryService } from './history/issue-history.service';
import { IssueLinksController } from './links/issue-links.controller';
import { IssueLinksService } from './links/issue-links.service';

@Module({
  imports: [UploadModule],
  controllers: [
    IssuesController,
    AttachmentsController,
    IssueHistoryController,
    IssueLinksController,
  ],
  providers: [IssuesService, AttachmentsService, IssueHistoryService, IssueLinksService],
  exports: [IssuesService],
})
export class IssuesModule {}
