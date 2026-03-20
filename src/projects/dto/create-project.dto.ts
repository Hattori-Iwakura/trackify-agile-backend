import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  // .toUpperCase() normalizes input before regex validation — users can type "proj" and it becomes "PROJ"
  key: z
    .string()
    .min(2)
    .max(10)
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]*$/, 'Key must start with a letter and contain only uppercase letters and numbers'),
  description: z.string().max(500).optional(),
});

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
