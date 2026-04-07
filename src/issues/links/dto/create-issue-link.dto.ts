import { z } from 'zod';

export const CreateIssueLinkSchema = z.object({
  targetIssueKey: z.string().min(1),
  linkType: z.enum(['BLOCKS', 'IS_BLOCKED_BY', 'RELATES_TO', 'DUPLICATES', 'IS_DUPLICATED_BY']),
});

export type CreateIssueLinkDto = z.infer<typeof CreateIssueLinkSchema>;
