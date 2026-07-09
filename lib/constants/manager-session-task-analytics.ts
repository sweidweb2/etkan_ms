import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import type { ManagerStudentTaskRow } from "@/types/manager-class-session-detail";

export type TaskCompletionBarPoint = {
  label: string;
  value: number;
  color: string;
};

export type TaskStudentGradeLinePoint = {
  student_label: string;
  grade: number | null;
};

function isStudentTaskFinished(status: ManagerStudentTaskRow["status"]) {
  return (
    status === STUDENT_TASK_STATUSES.GRADED ||
    status === STUDENT_TASK_STATUSES.SUBMITTED ||
    status === STUDENT_TASK_STATUSES.LATE
  );
}

function getShortStudentLabel(fullName: string, index: number) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]} ${parts[parts.length - 1]![0]}.`;
  }

  return parts[0] ?? `S${index + 1}`;
}

export function getTaskCompletionBarData(
  studentTasks: ManagerStudentTaskRow[]
): TaskCompletionBarPoint[] {
  const finishedCount = studentTasks.filter((row) =>
    isStudentTaskFinished(row.status)
  ).length;
  const notFinishedCount = studentTasks.length - finishedCount;

  return [
    {
      label: "Finished",
      value: finishedCount,
      color: "#10b981",
    },
    {
      label: "Not finished",
      value: notFinishedCount,
      color: "#f43f5e",
    },
  ];
}

export function getTaskStudentGradeLineData(
  studentTasks: ManagerStudentTaskRow[]
): TaskStudentGradeLinePoint[] {
  return [...studentTasks]
    .sort((left, right) => left.full_name.localeCompare(right.full_name))
    .map((row, index) => ({
      student_label: getShortStudentLabel(row.full_name, index),
      grade: row.grade,
    }));
}

export function getTaskAverageGrade(studentTasks: ManagerStudentTaskRow[]) {
  const gradedRows = studentTasks.filter((row) => row.grade !== null);

  if (gradedRows.length === 0) {
    return null;
  }

  const total = gradedRows.reduce((sum, row) => sum + (row.grade ?? 0), 0);
  return Math.round((total / gradedRows.length) * 10) / 10;
}
