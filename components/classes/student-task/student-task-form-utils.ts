import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import {
  resolveStudentTaskStatusOnSave,
  type EditStudentTaskInput,
} from "@/lib/validators/manager/edit-student-task";
import type { ManagerStudentTaskRow } from "@/types/manager-class-session-detail";

export function toDatetimeLocalValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function getStudentTaskFormDefaults(studentTask: ManagerStudentTaskRow) {
  return {
    status: studentTask.status,
    grade: studentTask.grade === null ? "" : studentTask.grade,
    notes: studentTask.notes ?? "",
    student_report: studentTask.student_report ?? "",
    submitted_at: studentTask.submitted_at
      ? toDatetimeLocalValue(studentTask.submitted_at)
      : "",
  };
}

export function shouldShowStudentTaskAnalyticsHint(
  gradeValue: EditStudentTaskInput["grade"],
  selectedStatus: EditStudentTaskInput["status"] | undefined
) {
  const hasGradeValue =
    gradeValue !== undefined &&
    gradeValue !== "" &&
    !Number.isNaN(Number(gradeValue));

  return (
    hasGradeValue &&
    selectedStatus !== STUDENT_TASK_STATUSES.GRADED &&
    selectedStatus !== STUDENT_TASK_STATUSES.LATE &&
    selectedStatus !== STUDENT_TASK_STATUSES.PENDING &&
    selectedStatus !== STUDENT_TASK_STATUSES.MISSING
  );
}

export function buildStudentTaskUpdateFormData(
  studentTaskId: string,
  values: EditStudentTaskInput,
  dueDate: string | null | undefined
) {
  const resolvedStatus = resolveStudentTaskStatusOnSave({
    status: values.status,
    grade: values.grade,
    dueDate,
  });

  const formData = new FormData();
  formData.set("id", studentTaskId);
  formData.set("status", resolvedStatus);
  formData.set(
    "grade",
    values.grade === undefined || values.grade === ""
      ? ""
      : String(values.grade)
  );
  formData.set("notes", values.notes ?? "");
  formData.set("student_report", values.student_report ?? "");
  formData.set("submitted_at", values.submitted_at ?? "");
  return formData;
}

export const STUDENT_TASK_TEXTAREA_CLASS =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";
