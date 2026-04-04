import { SetMetadata } from '@nestjs/common';
import { GlobalRole } from '../../../generated/prisma/enums';

export const GLOBAL_ROLES_KEY = 'globalRoles';
export const RequireGlobalRoles = (...roles: GlobalRole[]) =>
  SetMetadata(GLOBAL_ROLES_KEY, roles);
