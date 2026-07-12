import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { STUDENT_SEMESTER_STATUS_VALUES } from "@/lib/constants/manager-student-semester-status";
import type { FieldErrors } from "@/types/auth";

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

export function parseAddStudentToSemesterFormData(formData: FormData):
  | { success: true; data: AddStudentToSemesterInput & { semester_id: string } }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const semester_id = String(formData.get("semester_id") ?? "").trim();

  if (!semester_id) {
    return { success: false, error: "Semester is required." };
  }

  const parsed = addStudentToSemesterSchema.safeParse({
    student_profile_id: formData.get("student_profile_id"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return {
    success: true,
    data: {
      semester_id,
      ...parsed.data,
    },
  };
}
