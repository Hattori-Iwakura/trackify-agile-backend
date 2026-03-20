import { z } from 'zod';

export const ReorderIssueSchema = z.object({
  status: z.enum([
    'BACKLOG',
    'TODO',
    'IN_PROGRESS',
    'IN_REVIEW',
    'DONE',
    'CANCELLED',
  ]),
  position: z.number().int().min(0),
});

export type ReorderIssueDto = z.infer<typeof ReorderIssueSchema>;
