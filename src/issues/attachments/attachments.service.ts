import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadService } from '../../upload/upload.service';
import { ErrorCode } from '../../common/constants/error-codes';
import { parseIssueKey } from '../utils/parse-issue-key';
import type { ProjectRole } from '../../../generated/prisma/enums';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async upload(
    projectId: string,
    issueKey: string,
    uploaderId: string,
    file: Express.Multer.File,
  ) {
    const issue = await this.findIssueByKey(projectId, issueKey);

    return this.prisma.attachment.create({
      data: {
        filename: file.originalname.replace(/[/\\]/g, '_').slice(0, 255),
        url: file.path,
        mimeType: file.mimetype,
        size: file.size,
        issueId: issue.id,
        uploaderId,
      },
    });
  }

  async findAllForIssue(projectId: string, issueKey: string) {
    const issue = await this.findIssueByKey(projectId, issueKey);

    return this.prisma.attachment.findMany({
      where: { issueId: issue.id },
      include: {
        uploader: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(
    attachmentId: string,
    userId: string,
    memberRole: ProjectRole,
  ) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException({
        message: 'Attachment not found',
        errorCode: ErrorCode.ATTACHMENT_NOT_FOUND,
      });
    }

    const isUploader = attachment.uploaderId === userId;
    const isAdminOrOwner = memberRole === 'ADMIN' || memberRole === 'OWNER';

    if (!isUploader && !isAdminOrOwner) {
      throw new ForbiddenException({
        message: 'You can only delete your own attachments',
        errorCode: ErrorCode.ATTACHMENT_DELETE_FORBIDDEN,
      });
    }

    // Delete DB record first, then file — orphaned file on disk is less
    // problematic than an orphaned record pointing to a missing file
    await this.prisma.attachment.delete({
      where: { id: attachmentId },
    });

    this.uploadService.deleteFile(attachment.url);
  }

  private async findIssueByKey(projectId: string, issueKey: string) {
    const issueNumber = parseIssueKey(issueKey);

    const issue = await this.prisma.issue.findUnique({
      where: { projectId_issueNumber: { projectId, issueNumber } },
      select: { id: true },
    });

    if (!issue) {
      throw new NotFoundException({
        message: `Issue '${issueKey}' not found`,
        errorCode: ErrorCode.ISSUE_KEY_NOT_FOUND,
      });
    }

    return issue;
  }
}
