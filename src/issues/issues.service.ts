import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import { parseIssueKey } from './utils/parse-issue-key';
import type { CreateIssueDto } from './dto/create-issue.dto';
import type { UpdateIssueDto } from './dto/update-issue.dto';
import type { QueryIssuesDto } from './dto/query-issues.dto';
import type { ReorderIssueDto } from './dto/reorder-issue.dto';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type { IssueStatus } from '../../generated/prisma/enums';

@Injectable()
export class IssuesService {
  private readonly logger = new Logger(IssuesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateIssueDto, reporterId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.assigneeId) {
        const membership = await tx.projectMember.findUnique({
          where: { userId_projectId: { userId: dto.assigneeId, projectId } },
        });
        if (!membership) {
          throw new BadRequestException({
            message: 'Assignee is not a member of this project',
            errorCode: ErrorCode.ISSUE_ASSIGNEE_NOT_PROJECT_MEMBER,
          });
        }
      }

      const project = await tx.project.update({
        where: { id: projectId },
        data: { issueSequence: { increment: 1 } },
        select: { key: true, issueSequence: true },
      });

      const issueNumber = project.issueSequence;
      const issueKey = `${project.key}-${issueNumber}`;

      const issue = await tx.issue.create({
        data: {
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          type: dto.type,
          issueKey,
          issueNumber,
          projectId,
          reporterId,
          assigneeId: dto.assigneeId,
        },
        include: {
          assignee: { select: { id: true, fullName: true, email: true } },
          reporter: { select: { id: true, fullName: true, email: true } },
        },
      });

      if (dto.labelIds?.length) {
        await tx.issueLabel.createMany({
          data: dto.labelIds.map((labelId) => ({
            issueId: issue.id,
            labelId,
          })),
          skipDuplicates: true,
        });

        const labels = await tx.issueLabel.findMany({
          where: { issueId: issue.id },
          include: { label: true },
        });
        return { ...issue, labels };
      }

      return { ...issue, labels: [] };
    });
  }

  async findAll(
    projectId: string,
    query: QueryIssuesDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit, status, priority, type, assigneeId, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (assigneeId) where.assigneeId = assigneeId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { issueKey: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: { select: { id: true, fullName: true, email: true } },
          reporter: { select: { id: true, fullName: true, email: true } },
          labels: { include: { label: true } },
          _count: { select: { attachments: true, comments: true } },
        },
      }),
      this.prisma.issue.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(projectId: string, issueKey: string) {
    const issueNumber = parseIssueKey(issueKey);

    const issue = await this.prisma.issue.findUnique({
      where: { projectId_issueNumber: { projectId, issueNumber } },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        reporter: { select: { id: true, fullName: true, email: true } },
        labels: { include: { label: true } },
        attachments: {
          include: {
            uploader: { select: { id: true, fullName: true } },
          },
        },
        _count: { select: { comments: true } },
      },
    });

    if (!issue) {
      throw new NotFoundException({
        message: `Issue '${issueKey}' not found`,
        errorCode: ErrorCode.ISSUE_KEY_NOT_FOUND,
      });
    }

    return issue;
  }

  async update(projectId: string, issueKey: string, dto: UpdateIssueDto) {
    const issueNumber = parseIssueKey(issueKey);

    if (dto.assigneeId) {
      await this.validateAssignee(dto.assigneeId, projectId);
    }

    try {
      return await this.prisma.issue.update({
        where: { projectId_issueNumber: { projectId, issueNumber } },
        data: {
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          type: dto.type,
          assigneeId: dto.assigneeId,
        },
        include: {
          assignee: { select: { id: true, fullName: true, email: true } },
          reporter: { select: { id: true, fullName: true, email: true } },
          labels: { include: { label: true } },
        },
      });
    } catch (error) {
      if (error?.code === 'P2025') {
        throw new NotFoundException({
          message: `Issue '${issueKey}' not found`,
          errorCode: ErrorCode.ISSUE_KEY_NOT_FOUND,
        });
      }
      throw error;
    }
  }

  async updateStatus(projectId: string, issueKey: string, status: IssueStatus) {
    const issueNumber = parseIssueKey(issueKey);

    try {
      return await this.prisma.issue.update({
        where: { projectId_issueNumber: { projectId, issueNumber } },
        data: { status },
        include: {
          assignee: { select: { id: true, fullName: true, email: true } },
        },
      });
    } catch (error) {
      if (error?.code === 'P2025') {
        throw new NotFoundException({
          message: `Issue '${issueKey}' not found`,
          errorCode: ErrorCode.ISSUE_KEY_NOT_FOUND,
        });
      }
      throw error;
    }
  }

  async remove(projectId: string, issueKey: string) {
    const issueNumber = parseIssueKey(issueKey);

    try {
      await this.prisma.issue.delete({
        where: { projectId_issueNumber: { projectId, issueNumber } },
      });
    } catch (error) {
      if (error?.code === 'P2025') {
        throw new NotFoundException({
          message: `Issue '${issueKey}' not found`,
          errorCode: ErrorCode.ISSUE_KEY_NOT_FOUND,
        });
      }
      throw error;
    }
  }

  async getBoard(projectId: string, sprintId?: string) {
    const where: Record<string, unknown> = { projectId };
    if (sprintId) where.sprintId = sprintId;

    const issues = await this.prisma.issue.findMany({
      where,
      take: 500,
      orderBy: { position: 'asc' },
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        labels: { include: { label: true } },
        _count: { select: { attachments: true, comments: true } },
      },
    });

    const board: Record<string, typeof issues> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
      CANCELLED: [],
    };

    for (const issue of issues) {
      if (board[issue.status]) {
        board[issue.status].push(issue);
      }
    }

    return board;
  }

  async reorder(projectId: string, issueKey: string, dto: ReorderIssueDto) {
    const issueNumber = parseIssueKey(issueKey);

    const issue = await this.prisma.issue.findUnique({
      where: { projectId_issueNumber: { projectId, issueNumber } },
    });

    if (!issue) {
      throw new NotFoundException({
        message: `Issue '${issueKey}' not found`,
        errorCode: ErrorCode.ISSUE_KEY_NOT_FOUND,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Shift issues down to make room at the target position
      await tx.issue.updateMany({
        where: {
          projectId,
          status: dto.status as IssueStatus,
          position: { gte: dto.position },
          id: { not: issue.id },
        },
        data: { position: { increment: 1 } },
      });

      return tx.issue.update({
        where: { id: issue.id },
        data: {
          status: dto.status as IssueStatus,
          position: dto.position,
        },
        include: {
          assignee: { select: { id: true, fullName: true } },
        },
      });
    });
  }

  async addLabel(projectId: string, issueKey: string, labelId: string) {
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

    // Validate label belongs to the same project
    const label = await this.prisma.label.findFirst({
      where: { id: labelId, projectId },
    });

    if (!label) {
      throw new NotFoundException({
        message: `Label '${labelId}' not found in this project`,
        errorCode: ErrorCode.ISSUE_LABEL_NOT_FOUND,
      });
    }

    try {
      await this.prisma.issueLabel.create({
        data: { issueId: issue.id, labelId },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        // Label already attached — idempotent, no error
        return;
      }
      throw error;
    }
  }

  async removeLabel(projectId: string, issueKey: string, labelId: string) {
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

    try {
      await this.prisma.issueLabel.delete({
        where: { issueId_labelId: { issueId: issue.id, labelId } },
      });
    } catch (error) {
      if (error?.code === 'P2025') {
        throw new NotFoundException({
          message: `Label '${labelId}' is not attached to this issue`,
          errorCode: ErrorCode.ISSUE_LABEL_NOT_FOUND,
        });
      }
      throw error;
    }
  }

  private async validateAssignee(
    assigneeId: string,
    projectId: string,
  ): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: assigneeId, projectId } },
    });

    if (!membership) {
      throw new BadRequestException({
        message: 'Assignee is not a member of this project',
        errorCode: ErrorCode.ISSUE_ASSIGNEE_NOT_PROJECT_MEMBER,
      });
    }
  }
}
