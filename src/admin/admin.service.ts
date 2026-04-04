import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import type { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';
import type { UpdateUserRoleDto } from './dto/update-user-role.dto';

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers(pagination: PaginationDto): Promise<PaginatedResult<unknown>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          ...USER_SELECT,
          _count: { select: { projectMembers: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSystemStats() {
    const [users, projects, issues, sprints, comments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.project.count(),
      this.prisma.issue.count(),
      this.prisma.sprint.count(),
      this.prisma.comment.count(),
    ]);

    const issuesByStatus = await this.prisma.issue.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      users,
      projects,
      issues,
      sprints,
      comments,
      issuesByStatus: issuesByStatus.map((g) => ({
        status: g.status,
        count: g._count,
      })),
    };
  }

  async updateUserRole(
    targetUserId: string,
    dto: UpdateUserRoleDto,
    currentUserId: string,
  ) {
    if (targetUserId === currentUserId) {
      throw new ForbiddenException({
        message: 'Cannot change your own global role',
        errorCode: ErrorCode.ADMIN_CANNOT_DEMOTE_SELF,
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: ErrorCode.USER_NOT_FOUND,
      });
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: USER_SELECT,
    });
  }

  async deleteUser(targetUserId: string, currentUserId: string) {
    if (targetUserId === currentUserId) {
      throw new ForbiddenException({
        message: 'Cannot delete your own account via admin panel',
        errorCode: ErrorCode.ADMIN_CANNOT_DELETE_SELF,
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: ErrorCode.USER_NOT_FOUND,
      });
    }

    await this.prisma.user.delete({ where: { id: targetUserId } });
  }
}
