import { z } from 'zod';

export const CreateIssueSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']).optional(),
  type: z.enum(['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK']).optional(),
  assigneeId: z.string().uuid().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});

export type CreateIssueDto = z.infer<typeof CreateIssueSchema>;
