import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import { parseIssueKey } from '../issues/utils/parse-issue-key';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async resolveIssueByKey(projectId: string, issueKey: string) {
    const issueNumber = parseIssueKey(issueKey);
    const issue = await this.prisma.issue.findUnique({
      where: { projectId_issueNumber: { projectId, issueNumber } },
      select: { id: true, issueKey: true, projectId: true, reporterId: true },
    });

    if (!issue) {
      throw new NotFoundException({
        message: `Issue '${issueKey}' not found`,
        errorCode: ErrorCode.ISSUE_KEY_NOT_FOUND,
      });
    }

    return issue;
  }

  async create(
    issueId: string,
    authorId: string,
    dto: CreateCommentDto,
    context?: { projectId: string; issueKey: string },
  ) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true, issueKey: true, projectId: true, reporterId: true },
    });

    if (!issue) {
      throw new NotFoundException({
        message: 'Issue not found',
        errorCode: ErrorCode.ISSUE_NOT_FOUND,
      });
    }

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent || parent.issueId !== issueId) {
        throw new BadRequestException({
          message: 'Parent comment not found or belongs to a different issue',
          errorCode: ErrorCode.COMMENT_INVALID_PARENT,
        });
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        issueId,
        authorId,
        parentId: dto.parentId,
      },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    this.eventEmitter.emit('comment.added', {
      projectId: context?.projectId ?? issue.projectId,
      issueKey: context?.issueKey ?? issue.issueKey,
      commentId: comment.id,
      authorId,
      content: dto.content,
      parentId: dto.parentId ?? null,
      issueReporterId: issue.reporterId,
    });

    return comment;
  }

  async findAllForIssue(issueId: string) {
    return this.prisma.comment.findMany({
      where: { issueId, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async update(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
    projectRole?: string,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { issue: { select: { issueKey: true } } },
    });

    if (!comment) {
      throw new NotFoundException({
        message: 'Comment not found',
        errorCode: ErrorCode.COMMENT_NOT_FOUND,
      });
    }

    const isAuthor = comment.authorId === userId;
    const isAdminOrOwner = projectRole === 'ADMIN' || projectRole === 'OWNER';

    if (!isAuthor && !isAdminOrOwner) {
      throw new ForbiddenException({
        message: 'Only the author or project admin/owner can edit this comment',
        errorCode: ErrorCode.COMMENT_FORBIDDEN,
      });
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    this.eventEmitter.emit('comment.updated', {
      issueKey: comment.issue.issueKey,
      commentId: comment.id,
      content: dto.content,
    });

    return updated;
  }

  async remove(commentId: string, userId: string, projectRole?: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { issue: { select: { issueKey: true } } },
    });

    if (!comment) {
      throw new NotFoundException({
        message: 'Comment not found',
        errorCode: ErrorCode.COMMENT_NOT_FOUND,
      });
    }

    const isAuthor = comment.authorId === userId;
    const isAdminOrOwner = projectRole === 'ADMIN' || projectRole === 'OWNER';

    if (!isAuthor && !isAdminOrOwner) {
      throw new ForbiddenException({
        message: 'Only the author or project admin/owner can delete this comment',
        errorCode: ErrorCode.COMMENT_FORBIDDEN,
      });
    }

    await this.prisma.comment.delete({ where: { id: commentId } });

    this.eventEmitter.emit('comment.deleted', {
      issueKey: comment.issue.issueKey,
      commentId: comment.id,
    });
  }
}
