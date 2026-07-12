import type {
  ClassAnalyticsStudentTaskRow,
  ClassAnalyticsTaskRef,
} from "@/lib/manager/class-analytics";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { roundGrade } from "@/lib/compute/custom-compute-form-utils";

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

/** Mean of this student's normalized per-task grades across every class task. */
export function computeStudentTaskTotalGrade(
  classTasks: ClassAnalyticsTaskRef[],
  studentTasks: ClassAnalyticsStudentTaskRow[]
): number | null {
  if (classTasks.length === 0) {
    return null;
  }

  const studentTaskByTaskId = new Map(
    studentTasks.map((row) => [row.task_id, row])
  );
  const normalizedGrades: number[] = [];

  for (const classTask of classTasks) {
    const studentTask = studentTaskByTaskId.get(classTask.id);

    if (
      !studentTask ||
      studentTask.grade == null ||
      !isGradedStudentTask(studentTask.status)
    ) {
      return null;
    }

    normalizedGrades.push(
      normalizeGradePercent(Number(studentTask.grade), classTask.max_grade)
    );
  }

  return roundGrade(
    normalizedGrades.reduce((sum, value) => sum + value, 0) /
      normalizedGrades.length
  );
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
