import { z } from 'zod';

export const UpdateIssueStatusSchema = z.object({
  status: z.enum([
    'BACKLOG',
    'TODO',
    'IN_PROGRESS',
    'IN_REVIEW',
    'DONE',
    'CANCELLED',
  ]),
});

export type UpdateIssueStatusDto = z.infer<typeof UpdateIssueStatusSchema>;
