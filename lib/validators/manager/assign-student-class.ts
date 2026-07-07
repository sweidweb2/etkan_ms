import { z } from "zod";

export const assignStudentClassSchema = z.object({
  classId: z
    .string()
    .trim()
    .min(1, { message: "Please select a class." }),
});

export type AssignStudentClassInput = z.infer<typeof assignStudentClassSchema>;
