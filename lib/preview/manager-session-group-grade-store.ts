import type { SessionGroupGradeLevelValue } from "@/types/manager-session-group-grade";

const STORAGE_KEY = "etkan_ms_preview_session_group_grade_levels";

type StoredSessionGroupGrades = Record<string, SessionGroupGradeLevelValue>;

function readStore(): StoredSessionGroupGrades {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as StoredSessionGroupGrades;
  } catch {
    return {};
  }
}

function writeStore(store: StoredSessionGroupGrades) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getPreviewSessionGroupGradeFromStore(
  sessionId: string
): SessionGroupGradeLevelValue | null {
  return readStore()[sessionId] ?? null;
}

export function setPreviewSessionGroupGrade(
  sessionId: string,
  level: SessionGroupGradeLevelValue
) {
  const store = readStore();
  store[sessionId] = level;
  writeStore(store);
}
