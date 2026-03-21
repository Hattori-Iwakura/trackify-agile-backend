import { z } from 'zod';

export const CreateSprintSchema = z
  .object({
    name: z.string().min(1).max(100),
    goal: z.string().max(500).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    { message: 'endDate must be after startDate', path: ['endDate'] },
  );

export type CreateSprintDto = z.infer<typeof CreateSprintSchema>;
