import { z } from "zod";

export const createSessionTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Task title is required." })
    .max(120, { message: "Title must be at most 120 characters." }),
  description: z
    .string()
    .trim()
    .max(500, { message: "Description must be at most 500 characters." })
    .optional(),
  due_date: z.string().trim().optional(),
  max_grade: z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .min(0, { message: "Max grade must be at least 0." })
        .max(999, { message: "Max grade must be at most 999." }),
    ])
    .optional(),
});

export type CreateSessionTaskInput = z.infer<typeof createSessionTaskSchema>;
