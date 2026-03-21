import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import { parseIssueKey } from '../issues/utils/parse-issue-key';
import type { CreateSprintDto } from './dto/create-sprint.dto';
import type { UpdateSprintDto } from './dto/update-sprint.dto';

@Injectable()
export class SprintsService {
  private readonly logger = new Logger(SprintsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(projectId: string, dto: CreateSprintDto) {
    return this.prisma.sprint.create({
      data: {
        name: dto.name,
        goal: dto.goal,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: 'PLANNING',
        projectId,
      },
    });
  }

  async findAll(projectId: string) {
    return this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { issues: true } },
      },
    });
  }

  async findOne(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        issues: {
          include: {
            assignee: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException({
        message: `Sprint '${sprintId}' not found`,
        errorCode: ErrorCode.SPRINT_NOT_FOUND,
      });
    }

    return sprint;
  }

  async update(sprintId: string, dto: UpdateSprintDto) {
    try {
      return await this.prisma.sprint.update({
        where: { id: sprintId },
        data: {
          name: dto.name,
          goal: dto.goal,
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
      });
    } catch (error) {
      if (error?.code === 'P2025') {
        throw new NotFoundException({
          message: `Sprint '${sprintId}' not found`,
          errorCode: ErrorCode.SPRINT_NOT_FOUND,
        });
      }
      throw error;
    }
  }

  async remove(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
    });

    if (!sprint) {
      throw new NotFoundException({
        message: `Sprint '${sprintId}' not found`,
        errorCode: ErrorCode.SPRINT_NOT_FOUND,
      });
    }

    if (sprint.status !== 'PLANNING') {
      throw new BadRequestException({
        message: 'Only sprints in PLANNING status can be deleted',
        errorCode: ErrorCode.SPRINT_INVALID_TRANSITION,
      });
    }

    await this.prisma.sprint.delete({ where: { id: sprintId } });
  }

  async start(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
    });

    if (!sprint) {
      throw new NotFoundException({
        message: `Sprint '${sprintId}' not found`,
        errorCode: ErrorCode.SPRINT_NOT_FOUND,
      });
    }

    if (sprint.status !== 'PLANNING') {
      throw new BadRequestException({
        message: 'Only sprints in PLANNING status can be started',
        errorCode: ErrorCode.SPRINT_INVALID_TRANSITION,
      });
    }

    const activeSprint = await this.prisma.sprint.findFirst({
      where: { projectId: sprint.projectId, status: 'ACTIVE' },
    });

    if (activeSprint) {
      throw new ConflictException({
        message: 'Another sprint is already active in this project',
        errorCode: ErrorCode.SPRINT_ALREADY_ACTIVE,
      });
    }

    if (!sprint.startDate || !sprint.endDate) {
      throw new BadRequestException({
        message: 'Sprint must have startDate and endDate before starting',
        errorCode: ErrorCode.SPRINT_MISSING_DATES,
      });
    }

    const updated = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: { status: 'ACTIVE' },
    });

    const members = await this.prisma.projectMember.findMany({
      where: { projectId: sprint.projectId },
      select: { userId: true },
    });

    const memberIds = members.map((m) => m.userId);
    this.eventEmitter.emit('sprint.started', {
      projectId: sprint.projectId,
      sprintId,
      sprintName: sprint.name,
      memberIds,
    });

    return updated;
  }

  async complete(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
    });

    if (!sprint) {
      throw new NotFoundException({
        message: `Sprint '${sprintId}' not found`,
        errorCode: ErrorCode.SPRINT_NOT_FOUND,
      });
    }

    if (sprint.status !== 'ACTIVE') {
      throw new BadRequestException({
        message: 'Only ACTIVE sprints can be completed',
        errorCode: ErrorCode.SPRINT_INVALID_TRANSITION,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const completedSprint = await tx.sprint.update({
        where: { id: sprintId },
        data: { status: 'COMPLETED' },
      });

      await tx.issue.updateMany({
        where: {
          sprintId,
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
        data: { sprintId: null },
      });

      return completedSprint;
    });

    const members = await this.prisma.projectMember.findMany({
      where: { projectId: sprint.projectId },
      select: { userId: true },
    });

    const memberIds = members.map((m) => m.userId);
    this.eventEmitter.emit('sprint.completed', {
      projectId: sprint.projectId,
      sprintId,
      sprintName: sprint.name,
      memberIds,
    });

    return updated;
  }

  async getBacklog(projectId: string) {
    return this.prisma.issue.findMany({
      where: { projectId, sprintId: null },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        labels: { include: { label: true } },
      },
    });
  }

  async addIssueToSprint(
    sprintId: string,
    issueKey: string,
    projectId: string,
  ) {
    const issueNumber = parseIssueKey(issueKey);

    const issue = await this.prisma.issue.findUnique({
      where: { projectId_issueNumber: { projectId, issueNumber } },
    });

    if (!issue) {
      throw new NotFoundException({
        message: `Issue '${issueKey}' not found`,
        errorCode: ErrorCode.ISSUE_NOT_FOUND,
      });
    }

    return this.prisma.issue.update({
      where: { id: issue.id },
      data: { sprintId },
    });
  }

  async removeIssueFromSprint(
    sprintId: string,
    issueKey: string,
    projectId: string,
  ) {
    const issueNumber = parseIssueKey(issueKey);

    const issue = await this.prisma.issue.findUnique({
      where: { projectId_issueNumber: { projectId, issueNumber } },
    });

    if (!issue) {
      throw new NotFoundException({
        message: `Issue '${issueKey}' not found`,
        errorCode: ErrorCode.ISSUE_NOT_FOUND,
      });
    }

    return this.prisma.issue.update({
      where: { id: issue.id },
      data: { sprintId: null },
    });
  }
}
