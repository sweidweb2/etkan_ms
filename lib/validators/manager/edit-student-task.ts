import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import type { FieldErrors } from "@/types/auth";

export const STUDENT_TASK_STATUS_VALUES = [
  STUDENT_TASK_STATUSES.PENDING,
  STUDENT_TASK_STATUSES.SUBMITTED,
  STUDENT_TASK_STATUSES.GRADED,
  STUDENT_TASK_STATUSES.LATE,
  STUDENT_TASK_STATUSES.MISSING,
] as const;

function gradeFieldSchema(maxGrade: number | null) {
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

function hasProvidedGrade(grade: string | number | undefined) {
  return grade !== undefined && grade !== "";
}

export function isStudentTaskPastDue(
  dueDate: string | null | undefined,
  now: Date = new Date()
) {
  if (!dueDate) {
    return false;
  }

  const due = new Date(dueDate);
  return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
}

export type ResolveStudentTaskStatusInput<
  TStatus extends (typeof STUDENT_TASK_STATUS_VALUES)[number],
> = {
  status: TStatus;
  grade?: string | number | undefined;
  dueDate?: string | null;
  now?: Date;
};

/** Applies grade and due-date rules before persisting a student task update. */
export function resolveStudentTaskStatusOnSave<
  TStatus extends (typeof STUDENT_TASK_STATUS_VALUES)[number],
>(input: ResolveStudentTaskStatusInput<TStatus>): TStatus {
  const { status, grade, dueDate, now = new Date() } = input;
  const hasGrade = hasProvidedGrade(grade);

  if (hasGrade && status === STUDENT_TASK_STATUSES.PENDING) {
    return STUDENT_TASK_STATUSES.GRADED as TStatus;
  }

  let resolved = status;

  if (!hasGrade && status === STUDENT_TASK_STATUSES.GRADED) {
    resolved = STUDENT_TASK_STATUSES.PENDING as TStatus;
  }

  if (
    !hasGrade &&
    resolved === STUDENT_TASK_STATUSES.PENDING &&
    isStudentTaskPastDue(dueDate, now)
  ) {
    return STUDENT_TASK_STATUSES.MISSING as TStatus;
  }

  return resolved;
}

export function createEditStudentTaskSchema(
  maxGrade: number | null,
  dueDate?: string | null
) {
  return z
    .object({
      status: z.enum(STUDENT_TASK_STATUS_VALUES, {
        message: "Status is required.",
      }),
      grade: gradeFieldSchema(maxGrade),
      notes: z
        .string()
        .trim()
        .max(500, { message: "Notes must be at most 500 characters." })
        .optional(),
      submitted_at: z.string().trim().optional(),
    })
    .transform((data) => ({
      ...data,
      status: resolveStudentTaskStatusOnSave({
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
    submitted_at: formData.get("submitted_at") ?? undefined,
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
