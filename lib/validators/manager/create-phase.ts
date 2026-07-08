import { z } from "zod";

export const createPhaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Semester name is required." })
    .max(120, { message: "Semester name must be at most 120 characters." }),
  nb_courses: z.coerce
    .number()
    .int({ message: "Number of courses must be a whole number." })
    .min(0, { message: "Number of courses must be 0 or greater." })
    .max(1000, { message: "Number of courses must be at most 1000." }),
  amount: z.coerce
    .number()
    .min(0, { message: "Amount must be 0 or greater." })
    .max(1000000, { message: "Amount must be at most 1,000,000." }),
});

export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;
