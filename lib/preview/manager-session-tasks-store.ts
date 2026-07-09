import type { ManagerSessionTaskRow } from "@/types/manager-class-session-detail";

const STORAGE_KEY = "etkan_ms_preview_session_tasks";

type StoredSessionTasks = Record<string, ManagerSessionTaskRow[]>;

function readStore(): StoredSessionTasks {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as StoredSessionTasks;
  } catch {
    return {};
  }
}

function writeStore(store: StoredSessionTasks) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getPreviewSessionTasksFromStore(
  sessionId: string
): ManagerSessionTaskRow[] {
  return readStore()[sessionId] ?? [];
}

export function appendPreviewSessionTask(task: ManagerSessionTaskRow) {
  const store = readStore();
  const current = store[task.session_id] ?? [];
  store[task.session_id] = [task, ...current.filter((row) => row.id !== task.id)];
  writeStore(store);
}

export function getPreviewSessionTaskFromStore(
  sessionId: string,
  taskId: string
): ManagerSessionTaskRow | null {
  return (
    getPreviewSessionTasksFromStore(sessionId).find((task) => task.id === taskId) ??
    null
  );
}
