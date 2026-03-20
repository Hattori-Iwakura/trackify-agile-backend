import { z } from 'zod';

export const CreateLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF0000)'),
});

export type CreateLabelDto = z.infer<typeof CreateLabelSchema>;
