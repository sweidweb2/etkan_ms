import { z } from "zod";

export const addStudentToClassSchema = z.object({
  studentProfileId: z
    .string()
    .trim()
    .min(1, { message: "Please select a student." }),
});

export type AddStudentToClassInput = z.infer<typeof addStudentToClassSchema>;
