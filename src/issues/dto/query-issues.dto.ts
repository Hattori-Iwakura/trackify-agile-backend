import { z } from 'zod';
import { PaginationSchema } from '../../common/dto/pagination.dto';

export const QueryIssuesSchema = PaginationSchema.extend({
  status: z
    .enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'])
    .optional(),
  priority: z
    .enum(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'])
    .optional(),
  type: z.enum(['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK']).optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});

export type QueryIssuesDto = z.infer<typeof QueryIssuesSchema>;
