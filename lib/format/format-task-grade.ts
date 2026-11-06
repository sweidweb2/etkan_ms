import {
  YES_NO_GRADE,
  YES_NO_GRADE_LABELS,
  YES_NO_TASK_LABEL,
} from "@/lib/constants/task-yes-no";

const EMPTY_GRADE = "—";

/** Task "max grade" cell: "Yes/No" for Yes/No tasks, otherwise the max or "—". */
export function formatTaskMaxGrade({
  maxGrade,
  isYesNo,
}: {
  maxGrade: number | null | undefined;
  isYesNo: boolean | undefined;
}): string {
  if (isYesNo) {
    return YES_NO_TASK_LABEL;
  }
  return maxGrade == null ? EMPTY_GRADE : String(maxGrade);
}

export function formatYesNoGrade(grade: number | null | undefined): string {
  if (grade == null) {
    return EMPTY_GRADE;
  }
  return Number(grade) === YES_NO_GRADE.YES
    ? YES_NO_GRADE_LABELS.YES
    : YES_NO_GRADE_LABELS.NO;
}

/** On-screen task grade: "Yes"/"No" for Yes/No tasks, otherwise "grade/max". */
export function formatTaskGrade({
  grade,
  maxGrade,
  isYesNo,
  emptyLabel = EMPTY_GRADE,
}: {
  grade: number | null | undefined;
  maxGrade: number | null | undefined;
  isYesNo: boolean | undefined;
  emptyLabel?: string;
}): string {
  if (isYesNo) {
    return grade == null ? emptyLabel : formatYesNoGrade(grade);
  }
  if (grade == null) {
    return emptyLabel;
  }
  return maxGrade == null ? String(grade) : `${grade}/${maxGrade}`;
}
