import { z } from "zod";

const optionalUrlField = z
  .string()
  .trim()
  .url({ message: "Please enter a valid URL." })
  .max(2048, { message: "URL must be at most 2048 characters." })
  .optional()
  .or(z.literal(""));

export const createSubjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Subject name is required." })
    .max(120, { message: "Subject name must be at most 120 characters." }),
  syllabus_link: optionalUrlField,
  reference_link: optionalUrlField,
  handout_link: optionalUrlField,
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
