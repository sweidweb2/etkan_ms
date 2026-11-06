import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import {
  isStudentWorkPastDue,
  resolveStudentWorkStatusOnSave,
} from "@/lib/validators/manager/resolve-student-work-status";
import { isYesNoGradeValue } from "@/lib/validators/manager/task-yes-no";
import type { FieldErrors } from "@/types/auth";

export const STUDENT_TASK_STATUS_VALUES = [
  STUDENT_TASK_STATUSES.PENDING,
  STUDENT_TASK_STATUSES.SUBMITTED,
  STUDENT_TASK_STATUSES.GRADED,
  STUDENT_TASK_STATUSES.LATE,
  STUDENT_TASK_STATUSES.MISSING,
] as const;

function yesNoGradeFieldSchema() {
  return z
    .union([
      z.literal(""),
      z.coerce.number().refine(isYesNoGradeValue, {
        message: "Choose Yes or No.",
      }),
    ])
    .optional();
}

function gradeFieldSchema(maxGrade: number | null, isYesNo = false) {
  if (isYesNo) {
    return yesNoGradeFieldSchema();
  }

  const upperBound = maxGrade ?? 999;
  const maxMessage =
    maxGrade === null
      ? "Grade must be at most 999."
      : `Grade must be at most ${maxGrade}.`;

  return z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .min(0, { message: "Grade must be at least 0." })
        .max(upperBound, { message: maxMessage }),
    ])
    .optional();
}

export { isStudentWorkPastDue as isStudentTaskPastDue };
export { resolveStudentWorkStatusOnSave as resolveStudentTaskStatusOnSave };

export type ResolveStudentTaskStatusInput<
  TStatus extends (typeof STUDENT_TASK_STATUS_VALUES)[number],
> = {
  status: TStatus;
  grade?: string | number | undefined;
  dueDate?: string | null;
  now?: Date;
};

export function createEditStudentTaskSchema(
  maxGrade: number | null,
  dueDate?: string | null,
  options?: { isYesNo?: boolean }
) {
  return z
    .object({
      status: z.enum(STUDENT_TASK_STATUS_VALUES, {
        message: "Status is required.",
      }),
      grade: gradeFieldSchema(maxGrade, options?.isYesNo ?? false),
      notes: z
        .string()
        .trim()
        .max(500, { message: "Notes must be at most 500 characters." })
        .optional(),
      student_report: z
        .string()
        .trim()
        .max(5000, {
          message: "Student report must be at most 5000 characters.",
        })
        .optional(),
      submitted_at: z.string().trim().optional(),
    })
    .transform((data) => ({
      ...data,
      status: resolveStudentWorkStatusOnSave({
        status: data.status,
        grade: data.grade,
        dueDate,
      }),
    }));
}

export const editStudentTaskSchema = createEditStudentTaskSchema(null);

export type EditStudentTaskInput = z.infer<typeof editStudentTaskSchema>;

export function parseEditStudentTaskFormData(formData: FormData):
  | {
      success: true;
      data: EditStudentTaskInput & { id: string };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { success: false, error: "Student task id is required." };
  }

  const parsed = editStudentTaskSchema.safeParse({
    status: formData.get("status"),
    grade: formData.get("grade") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    student_report: formData.get("student_report") ?? undefined,
    submitted_at: formData.get("submitted_at") ?? undefined,
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return {
    success: true,
    data: {
      id,
      ...parsed.data,
    },
  };
}
