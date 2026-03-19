import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[@#$%^&*!]/,
      'Password must contain at least one special character (@#$%^&*!)',
    ),
  fullName: z.string().min(1, 'Full name is required').max(100),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
