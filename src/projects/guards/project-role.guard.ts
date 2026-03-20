import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PROJECT_ROLES_KEY } from '../decorators/require-project-roles.decorator';
import { ErrorCode } from '../../common/constants/error-codes';
import type { ProjectRole } from '../../../generated/prisma/enums';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params?.projectId;

    if (!user?.id || !projectId) {
      throw new ForbiddenException({
        message: 'You are not a member of this project',
        errorCode: ErrorCode.PROJECT_ACCESS_DENIED,
      });
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId: user.id, projectId },
      },
    });

    if (!membership) {
      throw new ForbiddenException({
        message: 'You are not a member of this project',
        errorCode: ErrorCode.PROJECT_ACCESS_DENIED,
      });
    }

    const requiredRoles = this.reflector.getAllAndOverride<ProjectRole[]>(
      PROJECT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        const roleList = requiredRoles.join(', ');
        throw new ForbiddenException({
          message: `Insufficient project role. Required: ${roleList}`,
          errorCode: ErrorCode.PROJECT_ACCESS_DENIED,
        });
      }
    }

    request.projectMember = membership;
    return true;
  }
}
