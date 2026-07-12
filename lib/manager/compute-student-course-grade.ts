import type {
  ClassAnalyticsStudentTaskRow,
  ClassAnalyticsTaskRef,
} from "@/lib/manager/class-analytics";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import {
  parseWeight,
  roundGrade,
} from "@/lib/compute/custom-compute-form-utils";

function isGradedStudentTask(status: string) {
  return (
    status === STUDENT_TASK_STATUSES.GRADED ||
    status === STUDENT_TASK_STATUSES.LATE
  );
}

function normalizeGradePercent(grade: number, maxGrade: number | null) {
  const cap = maxGrade != null && Number(maxGrade) > 0 ? Number(maxGrade) : 100;
  return (grade / cap) * 100;
}

/**
 * Whether this student task/exam row counts toward official course compute.
 * `missing` counts as scored (0 if grade is null).
 */
export function isStudentTaskScoredForCompute(
  grade: number | null | undefined,
  status: string
) {
  if (status === STUDENT_TASK_STATUSES.MISSING) {
    return true;
  }

  return grade != null && isGradedStudentTask(status);
}

/** Numeric points used for compute; null when the row does not count yet. */
export function resolveScoreForCompute(
  grade: number | null | undefined,
  status: string
): number | null {
  if (status === STUDENT_TASK_STATUSES.MISSING) {
    return grade ?? 0;
  }

  if (grade == null || !isGradedStudentTask(status)) {
    return null;
  }

  return Number(grade);
}

/**
 * Weighted sum of normalized task percents.
 * Entries with weightPercent <= 0 are skipped. Returns null if none contribute.
 */
export function computeWeightedNormalizedTaskTotal(
  entries: Array<{ normalizedPercent: number; weightPercent: number }>
): number | null {
  let weightedSum = 0;
  let hasPositiveWeight = false;

  for (const entry of entries) {
    if (entry.weightPercent <= 0) {
      continue;
    }

    hasPositiveWeight = true;
    weightedSum += entry.normalizedPercent * (entry.weightPercent / 100);
  }

  if (!hasPositiveWeight) {
    return null;
  }

  return roundGrade(weightedSum);
}

/**
 * Weighted total of this student's normalized per-task grades across every class task.
 * Requires every class task to be scored for compute (graded/late, or missing as 0).
 * Zero-weight tasks must still be scored but do not contribute to the sum.
 */
export function computeStudentTaskTotalGrade(
  classTasks: ClassAnalyticsTaskRef[],
  studentTasks: ClassAnalyticsStudentTaskRow[],
  taskWeights: Record<string, string>
): number | null {
  if (classTasks.length === 0) {
    return null;
  }

  const studentTaskByTaskId = new Map(
    studentTasks.map((row) => [row.task_id, row])
  );
  const entries: Array<{ normalizedPercent: number; weightPercent: number }> =
    [];

  for (const classTask of classTasks) {
    const studentTask = studentTaskByTaskId.get(classTask.id);
    const score = studentTask
      ? resolveScoreForCompute(studentTask.grade, studentTask.status)
      : null;

    if (score == null) {
      return null;
    }

    entries.push({
      normalizedPercent: normalizeGradePercent(score, classTask.max_grade),
      weightPercent: parseWeight(taskWeights[classTask.id] ?? "0"),
    });
  }

  return computeWeightedNormalizedTaskTotal(entries);
}

export function normalizeStoredFinalExamGrade(
  grade: number | null,
  maxGrade: number | null
): number | null {
  if (grade == null) {
    return null;
  }

  return roundGrade(normalizeGradePercent(Number(grade), maxGrade));
}

/** Final exam score for compute; `missing` → 0 when grade is null. */
export function normalizeFinalExamGradeForCompute(
  grade: number | null,
  status: string | null | undefined,
  maxGrade: number | null
): number | null {
  if (status === STUDENT_TASK_STATUSES.MISSING) {
    return normalizeStoredFinalExamGrade(grade ?? 0, maxGrade);
  }

  return normalizeStoredFinalExamGrade(grade, maxGrade);
}

export function computeWeightedCourseTotalGrade(input: {
  taskTotalGrade: number | null;
  finalExamGrade: number | null;
  tasksWeight: number;
  finalExamWeight: number;
}): number | null {
  if (input.taskTotalGrade == null || input.finalExamGrade == null) {
    return null;
  }

  return roundGrade(
    input.taskTotalGrade * (input.tasksWeight / 100) +
      input.finalExamGrade * (input.finalExamWeight / 100)
  );
}

export function isStudentTaskGraded(
  grade: number | null | undefined,
  status: string
) {
  return grade != null && isGradedStudentTask(status);
}
