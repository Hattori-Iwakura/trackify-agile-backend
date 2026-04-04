import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GLOBAL_ROLES_KEY } from '../decorators/require-global-role.decorator';
import { ErrorCode } from '../constants/error-codes';
import type { GlobalRole } from '../../../generated/prisma/enums';

@Injectable()
export class GlobalRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<GlobalRole[]>(
      GLOBAL_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException({
        message: 'Access denied',
        errorCode: ErrorCode.ADMIN_ACCESS_DENIED,
      });
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        message: 'Insufficient permissions. Admin access required.',
        errorCode: ErrorCode.ADMIN_ACCESS_DENIED,
      });
    }

    return true;
  }
}
