import type { ManagerClassFinalExamRow } from "@/types/manager-class-final-exam";

const STORAGE_KEY = "etkan_ms_preview_class_final_exams";

type StoredFinalExams = Record<string, ManagerClassFinalExamRow>;

function readStore(): StoredFinalExams {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as StoredFinalExams;
  } catch {
    return {};
  }
}

function writeStore(store: StoredFinalExams) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getPreviewClassFinalExamFromStore(
  classId: string
): ManagerClassFinalExamRow | null {
  return readStore()[classId] ?? null;
}

export function setPreviewClassFinalExam(exam: ManagerClassFinalExamRow) {
  const store = readStore();
  store[exam.class_id] = exam;
  writeStore(store);
}
