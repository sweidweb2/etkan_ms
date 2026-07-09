import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { getManagerClassStudentsPreview } from "@/lib/manager/get-manager-class-students-preview";
import { getPreviewClassFinalExamFromStore } from "@/lib/preview/manager-class-final-exam-store";
import { getPreviewStudentFinalExamGradesFromStore } from "@/lib/preview/manager-student-finalexam-grade-store";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash + character.charCodeAt(0)) % 997;
  }

  return hash;
}

export function getManagerClassFinalExamPreview(
  classId: string
): ManagerClassFinalExamRow | null {
  return getPreviewClassFinalExamFromStore(classId);
}

function buildMockStudentFinalExamGrade(
  exam: ManagerClassFinalExamRow,
  student: { user_id: string; full_name: string }
): ManagerStudentFinalExamGradeRow {
  const seed = hashString(`${exam.id}-${student.user_id}`);
  const statusValues = [
    STUDENT_TASK_STATUSES.PENDING,
    STUDENT_TASK_STATUSES.SUBMITTED,
    STUDENT_TASK_STATUSES.GRADED,
    STUDENT_TASK_STATUSES.LATE,
    STUDENT_TASK_STATUSES.MISSING,
  ] as const;
  const status = statusValues[seed % statusValues.length]!;
  const maxGrade = exam.max_grade ?? 100;
  const isGraded = status === STUDENT_TASK_STATUSES.GRADED;
  const hasSubmission =
    status === STUDENT_TASK_STATUSES.SUBMITTED ||
    status === STUDENT_TASK_STATUSES.GRADED ||
    status === STUDENT_TASK_STATUSES.LATE;

  const submittedAt = hasSubmission
    ? new Date(
        (exam.due_date ? new Date(exam.due_date) : new Date(exam.created_at)).getTime() -
          (seed % 2) * 86_400_000
      ).toISOString()
    : null;

  const gradedAt = isGraded
    ? new Date(
        new Date(submittedAt ?? exam.created_at).getTime() + 86_400_000
      ).toISOString()
    : null;

  const grade = isGraded
    ? Math.round((maxGrade * (0.5 + (seed % 45) / 100)) * 10) / 10
    : null;

  return {
    id: `${exam.id}-student-${student.user_id}`,
    final_exam_id: exam.id,
    student_id: student.user_id,
    full_name: student.full_name,
    status,
    submitted_at: submittedAt,
    grade,
    notes: seed % 4 === 0 ? "Reviewed with teacher." : null,
    graded_at: gradedAt,
    created_at: exam.created_at,
  };
}

export function getManagerStudentFinalExamGradesPreview(
  classId: string,
  exam: ManagerClassFinalExamRow
): ManagerStudentFinalExamGradeRow[] {
  const storedRows = getPreviewStudentFinalExamGradesFromStore(exam.id);
  const storedByStudentId = new Map(
    storedRows.map((row) => [row.student_id, row])
  );
  const students = getManagerClassStudentsPreview(classId);

  return students.map((student) => {
    const stored = storedByStudentId.get(student.user_id);
    if (stored) {
      return stored;
    }

    return buildMockStudentFinalExamGrade(exam, {
      user_id: student.user_id,
      full_name: student.full_name,
    });
  });
}

export function buildInitialStudentFinalExamGrades(
  classId: string,
  exam: ManagerClassFinalExamRow
): ManagerStudentFinalExamGradeRow[] {
  const students = getManagerClassStudentsPreview(classId);
  const createdAt = new Date().toISOString();

  return students.map((student) => ({
    id: `${exam.id}-student-${student.user_id}`,
    final_exam_id: exam.id,
    student_id: student.user_id,
    full_name: student.full_name,
    status: STUDENT_TASK_STATUSES.PENDING,
    submitted_at: null,
    grade: null,
    notes: null,
    graded_at: null,
    created_at: createdAt,
  }));
}
