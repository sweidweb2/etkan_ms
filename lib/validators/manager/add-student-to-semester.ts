import { z } from "zod";
import { STUDENT_SEMESTER_STATUS_VALUES } from "@/lib/constants/manager-student-semester-status";

export const addStudentToSemesterSchema = z.object({
  student_profile_id: z
    .string()
    .trim()
    .min(1, { message: "Student is required." }),
  status: z.enum(STUDENT_SEMESTER_STATUS_VALUES, {
    message: "Status is required.",
  }),
});

export type AddStudentToSemesterInput = z.infer<typeof addStudentToSemesterSchema>;
