import { z } from 'zod';
import { ProjectRole } from '../../../generated/prisma/enums';

export const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(ProjectRole).default(ProjectRole.MEMBER),
});

export type AddMemberDto = z.infer<typeof AddMemberSchema>;
