import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";

export type ClassAnalyticsTaskRef = {
  id: string;
  max_grade: number | null;
};

export type ClassAnalyticsStudentTaskRow = {
  task_id: string;
  grade: number | null;
  status: string;
};

export type ClassSessionTaskGradeSummary = {
  average_grade: number;
  task_count: number;
  graded_count: number;
};

function isGradedStudentTaskForAnalytics(status: string) {
  return (
    status === STUDENT_TASK_STATUSES.GRADED ||
    status === STUDENT_TASK_STATUSES.LATE
  );
}

function normalizeGradePercent(grade: number, maxGrade: number | null) {
  const cap = maxGrade != null && Number(maxGrade) > 0 ? Number(maxGrade) : 100;
  return (grade / cap) * 100;
}

export function buildGradesByTaskId(rows: ClassAnalyticsStudentTaskRow[]) {
  const gradesByTaskId = new Map<string, number[]>();

  for (const row of rows) {
    if (row.grade == null || !isGradedStudentTaskForAnalytics(row.status)) {
      continue;
    }

    const list = gradesByTaskId.get(row.task_id) ?? [];
    list.push(Number(row.grade));
    gradesByTaskId.set(row.task_id, list);
  }

  return gradesByTaskId;
}

/** Mean of per-task grade averages so sessions with multiple tasks count each task equally. */
export function computeSessionTaskGradeSummary(
  sessionTasks: ClassAnalyticsTaskRef[],
  gradesByTaskId: Map<string, number[]>
): ClassSessionTaskGradeSummary {
  if (sessionTasks.length === 0) {
    return { average_grade: 0, task_count: 0, graded_count: 0 };
  }

  const taskAverages: number[] = [];
  let gradedCount = 0;

  for (const task of sessionTasks) {
    const taskGrades = gradesByTaskId.get(task.id) ?? [];
    if (taskGrades.length === 0) {
      continue;
    }

    gradedCount += taskGrades.length;
    const normalized = taskGrades.map((grade) =>
      normalizeGradePercent(grade, task.max_grade)
    );
    const taskAverage =
      normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
    taskAverages.push(taskAverage);
  }

  if (taskAverages.length === 0) {
    return {
      average_grade: 0,
      task_count: sessionTasks.length,
      graded_count: 0,
    };
  }

  const average =
    taskAverages.reduce((sum, value) => sum + value, 0) / taskAverages.length;

  return {
    average_grade: Math.round(average * 10) / 10,
    task_count: sessionTasks.length,
    graded_count: gradedCount,
  };
}

export function computeOverallAverageTaskGrade(
  points: ClassSessionTaskGradeSummary[]
) {
  const gradedSessions = points.filter((point) => point.graded_count > 0);

  if (gradedSessions.length === 0) {
    return 0;
  }

  const total = gradedSessions.reduce(
    (sum, point) => sum + point.average_grade,
    0
  );

  return Math.round((total / gradedSessions.length) * 10) / 10;
}
