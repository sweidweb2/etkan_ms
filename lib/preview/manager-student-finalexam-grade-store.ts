import type { ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";

const STORAGE_KEY = "etkan_ms_preview_student_finalexam_grades";

type StoredStudentFinalExamGrades = Record<string, ManagerStudentFinalExamGradeRow[]>;

function readStore(): StoredStudentFinalExamGrades {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as StoredStudentFinalExamGrades;
  } catch {
    return {};
  }
}

function writeStore(store: StoredStudentFinalExamGrades) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getPreviewStudentFinalExamGradesFromStore(
  finalExamId: string
): ManagerStudentFinalExamGradeRow[] {
  return readStore()[finalExamId] ?? [];
}

export function upsertPreviewStudentFinalExamGrade(
  row: ManagerStudentFinalExamGradeRow
) {
  const store = readStore();
  const current = store[row.final_exam_id] ?? [];
  store[row.final_exam_id] = [
    row,
    ...current.filter(
      (existing) =>
        existing.id !== row.id && existing.student_id !== row.student_id
    ),
  ];
  writeStore(store);
}

export function setPreviewStudentFinalExamGrades(
  finalExamId: string,
  rows: ManagerStudentFinalExamGradeRow[]
) {
  const store = readStore();
  store[finalExamId] = rows;
  writeStore(store);
}
