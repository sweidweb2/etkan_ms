/**
 * Class task grade rollup:
 * - totalMax = sum of task max_grade values
 * - per student = sum of that student's grades across tasks (null → 0)
 * - averageEarned = mean of per-student totals
 *
 * Example: 2 tasks @ 100, students scoring 90/90 and 80/80 → 170 / 200.
 */

export type ClassTaskGradeSummaryInput = {
  tasks: Array<{ id: string; max_grade: number | null }>;
  studentTasks: Array<{
    task_id: string;
    student_id: string;
    grade: number | null;
  }>;
};

export type ClassTaskGradeSummary = {
  averageEarned: number;
  totalMax: number;
  /** 0–100 progress for the gauge */
  progressPercent: number;
  studentCount: number;
  taskCount: number;
  gradedCellCount: number;
};

export function computeClassTaskGradeSummary(
  input: ClassTaskGradeSummaryInput
): ClassTaskGradeSummary {
  const taskIds = new Set(input.tasks.map((task) => task.id));
  const totalMax = input.tasks.reduce((sum, task) => {
    const max = task.max_grade;
    if (max == null || Number.isNaN(Number(max))) {
      return sum;
    }
    return sum + Number(max);
  }, 0);

  const totalsByStudent = new Map<string, number>();
  let gradedCellCount = 0;

  for (const row of input.studentTasks) {
    if (!taskIds.has(row.task_id)) {
      continue;
    }

    const current = totalsByStudent.get(row.student_id) ?? 0;
    if (row.grade != null && !Number.isNaN(Number(row.grade))) {
      gradedCellCount += 1;
      totalsByStudent.set(row.student_id, current + Number(row.grade));
    } else if (!totalsByStudent.has(row.student_id)) {
      totalsByStudent.set(row.student_id, 0);
    }
  }

  const studentCount = totalsByStudent.size;
  const averageEarned =
    studentCount === 0
      ? 0
      : [...totalsByStudent.values()].reduce((sum, value) => sum + value, 0) /
        studentCount;

  const roundedAverage = Math.round(averageEarned * 10) / 10;
  const progressPercent =
    totalMax <= 0
      ? 0
      : Math.min(100, Math.max(0, (roundedAverage / totalMax) * 100));

  return {
    averageEarned: roundedAverage,
    totalMax,
    progressPercent: Math.round(progressPercent * 10) / 10,
    studentCount,
    taskCount: input.tasks.length,
    gradedCellCount,
  };
}
