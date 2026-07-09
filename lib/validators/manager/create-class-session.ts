import { z } from "zod";

export const createClassSessionSchema = z
  .object({
    topic: z
      .string()
      .trim()
      .min(1, { message: "Session topic is required." })
      .max(120, { message: "Topic must be at most 120 characters." }),
    starts_at: z
      .string()
      .trim()
      .min(1, { message: "Start date and time are required." }),
    ends_at: z
      .string()
      .trim()
      .min(1, { message: "End date and time are required." }),
  })
  .refine(
    (values) => {
      const startsAt = new Date(values.starts_at);
      const endsAt = new Date(values.ends_at);

      return (
        !Number.isNaN(startsAt.getTime()) &&
        !Number.isNaN(endsAt.getTime()) &&
        endsAt > startsAt
      );
    },
    {
      message: "End must be after start.",
      path: ["ends_at"],
    }
  );

export type CreateClassSessionInput = z.infer<typeof createClassSessionSchema>;
