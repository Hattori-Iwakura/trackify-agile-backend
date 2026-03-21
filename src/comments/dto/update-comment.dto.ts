import { z } from 'zod';

export const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export type UpdateCommentDto = z.infer<typeof UpdateCommentSchema>;
