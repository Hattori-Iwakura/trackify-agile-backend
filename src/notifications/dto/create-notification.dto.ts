import { z } from 'zod';

export const CreateNotificationSchema = z.object({
  type: z.string(),
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(500),
  userId: z.string().uuid(),
  data: z.any().optional(),
});

export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;
