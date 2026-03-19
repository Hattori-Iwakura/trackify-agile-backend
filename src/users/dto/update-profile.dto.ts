import { z } from 'zod';

export const UpdateProfileSchema = z
  .object({
    fullName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
