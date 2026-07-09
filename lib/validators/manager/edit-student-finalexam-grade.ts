import { z } from "zod";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";

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
