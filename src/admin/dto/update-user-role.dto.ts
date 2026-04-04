import { z } from 'zod';

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'USER']),
});

export type UpdateUserRoleDto = z.infer<typeof UpdateUserRoleSchema>;
