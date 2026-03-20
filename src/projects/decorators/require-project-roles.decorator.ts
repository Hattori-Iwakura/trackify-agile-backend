import { SetMetadata } from '@nestjs/common';
import { ProjectRole } from '../../../generated/prisma/enums';

export const PROJECT_ROLES_KEY = 'projectRoles';
export const RequireProjectRoles = (...roles: ProjectRole[]) =>
  SetMetadata(PROJECT_ROLES_KEY, roles);
