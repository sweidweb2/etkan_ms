import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { getManagerClassStudentsPreview } from "@/lib/manager/get-manager-class-students-preview";
import { getPreviewStudentTasksFromStore } from "@/lib/preview/manager-student-tasks-store";
import type { ManagerSessionTaskRow, ManagerStudentTaskRow } from "@/types/manager-class-session-detail";

const STUDENT_TASK_NOTES = [
  null,
  null,
  "Resubmission requested",
  "Excellent work",
  "Needs revision on section 2",
] as const;

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash + character.charCodeAt(0)) % 997;
  }

  return hash;
}

function buildMockStudentTaskRow(
  task: ManagerSessionTaskRow,
  student: {
    user_id: string;
    student_profile_id: string;
    full_name: string;
  }
): ManagerStudentTaskRow {
  const seed = hashString(`${task.id}-${student.user_id}`);
  const statusValues = [
    STUDENT_TASK_STATUSES.PENDING,
    STUDENT_TASK_STATUSES.SUBMITTED,
    STUDENT_TASK_STATUSES.GRADED,
    STUDENT_TASK_STATUSES.LATE,
    STUDENT_TASK_STATUSES.MISSING,
  ] as const;
  const status = statusValues[seed % statusValues.length]!;
  const maxGrade = task.max_grade ?? 20;
  const hasSubmission =
    status === STUDENT_TASK_STATUSES.SUBMITTED ||
    status === STUDENT_TASK_STATUSES.GRADED ||
    status === STUDENT_TASK_STATUSES.LATE;
  const isGraded = status === STUDENT_TASK_STATUSES.GRADED;

  const submittedAt = hasSubmission
    ? new Date(
        (task.due_date ? new Date(task.due_date) : new Date(task.created_at)).getTime() -
          (seed % 3) * 86_400_000
      ).toISOString()
    : null;

  const gradedAt = isGraded
    ? new Date(
        new Date(submittedAt ?? task.created_at).getTime() + 86_400_000
      ).toISOString()
    : null;

  const grade = isGraded
    ? Math.round((maxGrade * (0.55 + (seed % 40) / 100)) * 10) / 10
    : status === STUDENT_TASK_STATUSES.LATE
      ? Math.round((maxGrade * (0.45 + (seed % 30) / 100)) * 10) / 10
      : null;

  return {
    id: `${task.id}-student-task-${student.user_id}`,
    task_id: task.id,
    student_id: student.user_id,
    student_profile_id: student.student_profile_id,
    full_name: student.full_name,
    status,
    submitted_at: submittedAt,
    grade,
    notes: STUDENT_TASK_NOTES[seed % STUDENT_TASK_NOTES.length] ?? null,
    graded_at: gradedAt,
  };
}

export function getManagerSessionStudentTasksPreview(
  classId: string,
  task: ManagerSessionTaskRow
): ManagerStudentTaskRow[] {
  const students = getManagerClassStudentsPreview(classId);
  const storedRows = getPreviewStudentTasksFromStore(task.id);
  const storedByStudentId = new Map(
    storedRows.map((row) => [row.student_id, row])
  );

  return students.map((student) => {
    const stored = storedByStudentId.get(student.user_id);
    if (stored) {
      return stored;
    }

    return buildMockStudentTaskRow(task, {
      user_id: student.user_id,
      student_profile_id: student.student_profile_id,
      full_name: student.full_name,
    });
  });
}
