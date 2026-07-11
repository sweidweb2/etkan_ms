import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";

export function hasProvidedStudentWorkGrade(grade: string | number | undefined) {
  return grade !== undefined && grade !== "";
}

export function isStudentWorkPastDue(
  dueDate: string | null | undefined,
  now: Date = new Date()
) {
  if (!dueDate) {
    return false;
  }

  const due = new Date(dueDate);
  return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
}

export type ResolveStudentWorkStatusInput<
  TStatus extends string,
> = {
  status: TStatus;
  grade?: string | number | undefined;
  dueDate?: string | null;
  now?: Date;
};

/** Applies grade and due-date rules before persisting student task / final exam rows. */
export function resolveStudentWorkStatusOnSave<
  TStatus extends string,
>(input: ResolveStudentWorkStatusInput<TStatus>): TStatus {
  const { status, grade, dueDate, now = new Date() } = input;
  const hasGrade = hasProvidedStudentWorkGrade(grade);

  if (hasGrade && status === STUDENT_TASK_STATUSES.MISSING) {
    return STUDENT_TASK_STATUSES.LATE as TStatus;
  }

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
    isStudentWorkPastDue(dueDate, now)
  ) {
    return STUDENT_TASK_STATUSES.MISSING as TStatus;
  }

  return resolved as TStatus;
}
