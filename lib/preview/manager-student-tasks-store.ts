import type { ManagerStudentTaskRow } from "@/types/manager-class-session-detail";

const STORAGE_KEY = "etkan_ms_preview_student_tasks";

type StoredStudentTasks = Record<string, ManagerStudentTaskRow[]>;

function readStore(): StoredStudentTasks {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as StoredStudentTasks;
  } catch {
    return {};
  }
}

function writeStore(store: StoredStudentTasks) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getPreviewStudentTasksFromStore(
  taskId: string
): ManagerStudentTaskRow[] {
  return readStore()[taskId] ?? [];
}

export function upsertPreviewStudentTask(row: ManagerStudentTaskRow) {
  const store = readStore();
  const current = store[row.task_id] ?? [];
  store[row.task_id] = [
    row,
    ...current.filter(
      (existing) =>
        existing.id !== row.id && existing.student_id !== row.student_id
    ),
  ];
  writeStore(store);
}
