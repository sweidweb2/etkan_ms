import {
  DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT,
  DEFAULT_CLASS_GRADE_TASKS_WEIGHT,
} from "@/lib/constants/manager-class-grade-defaults";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { isStudentTaskGraded } from "@/lib/manager/compute-student-course-grade";
import type { FactorWeightsValues } from "@/lib/compute/custom-compute-form-utils";
import type {
  ManagerClassStudentGradeMissingItem,
  ManagerClassStudentGradeMissingReason,
} from "@/types/manager-class-student-grade";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { StudentFinalExamGradeRecord } from "@/repositories/final-exam.repository";
import type { StudentTaskRecord } from "@/repositories/student-task.repository";

type BuildMissingItemsInput = {
  classTasks: ManagerClassTaskForGradesRow[];
  studentTasks: StudentTaskRecord[];
  finalExam: { id: string; title: string; max_grade: number | null; due_date: string | null } | null;
  finalExamGrade: StudentFinalExamGradeRecord | null;
  factorWeights?: Pick<FactorWeightsValues, "tasks_weight" | "final_exam_weight">;
};

function resolveTaskMissingReason(
  studentTask: StudentTaskRecord | undefined
): ManagerClassStudentGradeMissingReason {
  if (!studentTask) {
    return "missing_record";
  }

  if (studentTask.status === STUDENT_TASK_STATUSES.PENDING) {
    return "pending";
  }

  if (!isStudentTaskGraded(studentTask.grade, studentTask.status)) {
    return "not_graded";
  }

  return "not_graded";
}

function formatMissingReasonLabel(
  reason: ManagerClassStudentGradeMissingReason
): string {
  switch (reason) {
    case "missing_record":
      return "No record";
    case "pending":
      return "Pending";
    case "not_graded":
      return "Not graded";
  }
}

function buildTaskMissingItems(
  classTasks: ManagerClassTaskForGradesRow[],
  studentTasks: StudentTaskRecord[]
): ManagerClassStudentGradeMissingItem[] {
  const tasksByTaskId = new Map(
    studentTasks.map((row) => [row.task_id, row])
  );
  const items: ManagerClassStudentGradeMissingItem[] = [];

  for (const task of classTasks) {
    const studentTask = tasksByTaskId.get(task.id);
    const reason = resolveTaskMissingReason(studentTask);

    if (studentTask && isStudentTaskGraded(studentTask.grade, studentTask.status)) {
      continue;
    }

    items.push({
      kind: "task",
      reason,
      label: `${task.session_label} · ${task.title} — ${formatMissingReasonLabel(reason)}`,
      status: studentTask?.status ?? null,
      grade: studentTask?.grade ?? null,
      taskId: task.id,
      sessionId: task.session_id,
      studentTaskId: studentTask?.id ?? null,
      maxGrade: task.max_grade,
      dueDate: task.due_date ?? null,
    });
  }

  return items;
}

function buildFinalExamMissingItems(
  finalExam: BuildMissingItemsInput["finalExam"],
  finalExamGrade: StudentFinalExamGradeRecord | null
): ManagerClassStudentGradeMissingItem[] {
  if (!finalExam) {
    return [
      {
        kind: "final_exam",
        reason: "missing_record",
        label: "Final exam — No record",
        status: null,
        grade: null,
      },
    ];
  }

  if (!finalExamGrade) {
    return [
      {
        kind: "final_exam",
        reason: "missing_record",
        label: `${finalExam.title} — No record`,
        status: null,
        grade: null,
        maxGrade: finalExam.max_grade,
        dueDate: finalExam.due_date,
      },
    ];
  }

  if (finalExamGrade.status === STUDENT_TASK_STATUSES.PENDING) {
    return [
      {
        kind: "final_exam",
        reason: "pending",
        label: `${finalExam.title} — Pending`,
        status: finalExamGrade.status,
        grade: finalExamGrade.grade,
        finalExamGradeId: finalExamGrade.id,
        maxGrade: finalExam.max_grade,
        dueDate: finalExam.due_date,
      },
    ];
  }

  if (!isStudentTaskGraded(finalExamGrade.grade, finalExamGrade.status)) {
    return [
      {
        kind: "final_exam",
        reason: "not_graded",
        label: `${finalExam.title} — Not graded`,
        status: finalExamGrade.status,
        grade: finalExamGrade.grade,
        finalExamGradeId: finalExamGrade.id,
        maxGrade: finalExam.max_grade,
        dueDate: finalExam.due_date,
      },
    ];
  }

  return [];
}

export function buildStudentGradeMissingItems(
  input: BuildMissingItemsInput
): ManagerClassStudentGradeMissingItem[] {
  const factorWeights = {
    tasks_weight:
      input.factorWeights?.tasks_weight ?? DEFAULT_CLASS_GRADE_TASKS_WEIGHT,
    final_exam_weight:
      input.factorWeights?.final_exam_weight ??
      DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT,
  };

  const items: ManagerClassStudentGradeMissingItem[] = [];

  if (factorWeights.tasks_weight > 0 && input.classTasks.length > 0) {
    items.push(...buildTaskMissingItems(input.classTasks, input.studentTasks));
  }

  if (factorWeights.final_exam_weight > 0) {
    items.push(
      ...buildFinalExamMissingItems(input.finalExam, input.finalExamGrade)
    );
  }

  return items;
}

export function hasStudentGradeMissingItems(
  items: ManagerClassStudentGradeMissingItem[]
): boolean {
  return items.length > 0;
}
