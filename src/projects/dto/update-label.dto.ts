import { z } from 'zod';

export const UpdateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF0000)').optional(),
});

export type UpdateLabelDto = z.infer<typeof UpdateLabelSchema>;
