import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import { ProjectRole } from '../../generated/prisma/enums';
import type { AddMemberDto } from './dto/add-member.dto';
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import type { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async addMember(
    projectId: string,
    dto: AddMemberDto,
    callerRole: ProjectRole,
  ) {
    // Lookup user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new NotFoundException({
        message: 'No user found with that email address',
        errorCode: ErrorCode.USER_NOT_FOUND,
      });
    }

    // Check not already a member
    const existing = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: user.id, projectId } },
    });
    if (existing) {
      throw new ConflictException({
        message: 'User is already a member of this project',
        errorCode: ErrorCode.PROJECT_MEMBER_EXISTS,
      });
    }

    // Role escalation check
    this.checkRoleEscalation(dto.role, callerRole);

    return this.prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId,
        role: dto.role,
      },
    });
  }

  async findAll(
    projectId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { projectId };

    const [data, total] = await Promise.all([
      this.prisma.projectMember.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      }),
      this.prisma.projectMember.count({ where }),
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

  async updateRole(
    projectId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
    callerRole: ProjectRole,
  ) {
    // Role escalation check (no DB needed, can run outside tx)
    this.checkRoleEscalation(dto.role, callerRole);

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } },
      });

      if (!member) {
        throw new NotFoundException({
          message: 'Member not found in this project',
          errorCode: ErrorCode.PROJECT_MEMBER_NOT_FOUND,
        });
      }

      // Last-owner rule: if demoting from OWNER (atomic check within transaction)
      if (member.role === ProjectRole.OWNER && dto.role !== ProjectRole.OWNER) {
        const ownerCount = await tx.projectMember.count({
          where: { projectId, role: ProjectRole.OWNER },
        });
        if (ownerCount <= 1) {
          throw new ConflictException({
            message: 'Cannot remove or demote the last project OWNER',
            errorCode: ErrorCode.PROJECT_LAST_OWNER,
          });
        }
      }

      return tx.projectMember.update({
        where: { userId_projectId: { userId, projectId } },
        data: { role: dto.role },
      });
    });
  }

  async removeMember(
    projectId: string,
    userId: string,
    callerRole: ProjectRole,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } },
      });

      if (!member) {
        throw new NotFoundException({
          message: 'Member not found in this project',
          errorCode: ErrorCode.PROJECT_MEMBER_NOT_FOUND,
        });
      }

      // Prevent ADMIN from removing OWNER (privilege escalation)
      if (member.role === ProjectRole.OWNER && callerRole !== ProjectRole.OWNER) {
        throw new ForbiddenException({
          message: 'Only OWNER can remove another OWNER',
          errorCode: ErrorCode.PROJECT_ACCESS_DENIED,
        });
      }

      // Last-owner rule (atomic check within transaction)
      if (member.role === ProjectRole.OWNER) {
        const ownerCount = await tx.projectMember.count({
          where: { projectId, role: ProjectRole.OWNER },
        });
        if (ownerCount <= 1) {
          throw new ConflictException({
            message: 'Cannot remove or demote the last project OWNER',
            errorCode: ErrorCode.PROJECT_LAST_OWNER,
          });
        }
      }

      return tx.projectMember.delete({
        where: { userId_projectId: { userId, projectId } },
      });
    });
  }

  async leave(projectId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } },
      });

      if (!member) {
        throw new NotFoundException({
          message: 'Member not found in this project',
          errorCode: ErrorCode.PROJECT_MEMBER_NOT_FOUND,
        });
      }

      // Last-owner rule (atomic check within transaction)
      if (member.role === ProjectRole.OWNER) {
        const ownerCount = await tx.projectMember.count({
          where: { projectId, role: ProjectRole.OWNER },
        });
        if (ownerCount <= 1) {
          throw new ConflictException({
            message: 'Cannot remove or demote the last project OWNER',
            errorCode: ErrorCode.PROJECT_LAST_OWNER,
          });
        }
      }

      return tx.projectMember.delete({
        where: { userId_projectId: { userId, projectId } },
      });
    });
  }

  private checkRoleEscalation(targetRole: ProjectRole, callerRole: ProjectRole) {
    if (
      (targetRole === ProjectRole.ADMIN || targetRole === ProjectRole.OWNER) &&
      callerRole !== ProjectRole.OWNER
    ) {
      throw new ForbiddenException({
        message: 'Only project OWNER can assign ADMIN or OWNER roles',
        errorCode: ErrorCode.PROJECT_ACCESS_DENIED,
      });
    }
  }

}
