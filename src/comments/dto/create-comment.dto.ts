import { z } from 'zod';

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
});

export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;
