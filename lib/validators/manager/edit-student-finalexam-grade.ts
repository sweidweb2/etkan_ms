import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import type { FieldErrors } from "@/types/auth";

export const STUDENT_FINAL_EXAM_STATUS_VALUES = [
  STUDENT_TASK_STATUSES.PENDING,
  STUDENT_TASK_STATUSES.SUBMITTED,
  STUDENT_TASK_STATUSES.GRADED,
  STUDENT_TASK_STATUSES.LATE,
  STUDENT_TASK_STATUSES.MISSING,
] as const;

export const editStudentFinalExamGradeSchema = z.object({
  status: z.enum(STUDENT_FINAL_EXAM_STATUS_VALUES, {
    message: "Status is required.",
  }),
  grade: z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .min(0, { message: "Grade must be at least 0." })
        .max(999, { message: "Grade must be at most 999." }),
    ])
    .optional(),
  notes: z
    .string()
    .trim()
    .max(500, { message: "Notes must be at most 500 characters." })
    .optional(),
  submitted_at: z.string().trim().optional(),
  graded_at: z.string().trim().optional(),
});

export type EditStudentFinalExamGradeInput = z.infer<
  typeof editStudentFinalExamGradeSchema
>;

export function parseEditStudentFinalExamGradeFormData(formData: FormData):
  | {
      success: true;
      data: EditStudentFinalExamGradeInput & { id: string };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { success: false, error: "Grade id is required." };
  }

  const parsed = editStudentFinalExamGradeSchema.safeParse({
    status: formData.get("status"),
    grade: formData.get("grade") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    submitted_at: formData.get("submitted_at") ?? undefined,
    graded_at: formData.get("graded_at") ?? undefined,
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
      id,
      ...parsed.data,
    },
  };
}
