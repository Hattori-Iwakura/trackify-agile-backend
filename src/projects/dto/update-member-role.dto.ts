import { z } from 'zod';
import { ProjectRole } from '../../../generated/prisma/enums';

export const UpdateMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectRole),
});

export type UpdateMemberRoleDto = z.infer<typeof UpdateMemberRoleSchema>;
