import { z } from 'zod';

export const UpdateIssueSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']).optional(),
  type: z.enum(['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK']).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export type UpdateIssueDto = z.infer<typeof UpdateIssueSchema>;
