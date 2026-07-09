import { getManagerClassSessionTasksPreview } from "@/lib/constants/manager-class-session-detail-mock";
import {
  getPreviewSessionTasksFromStore,
} from "@/lib/preview/manager-session-tasks-store";
import type { ManagerSessionTaskRow } from "@/types/manager-class-session-detail";

export function getManagerSessionTaskPreview(
  classId: string,
  sessionId: string,
  taskId: string
): ManagerSessionTaskRow | null {
  const tasks = getManagerClassSessionTasksPreview(classId, sessionId);
  const storedTasks = getPreviewSessionTasksFromStore(sessionId);
  const mergedTasks = [...storedTasks, ...tasks];

  return (
    mergedTasks.find(
      (task) => task.id === taskId && task.session_id === sessionId
    ) ?? null
  );
}

export function getNextSessionTaskId(
  sessionId: string,
  tasks: ManagerSessionTaskRow[]
): string {
  const maxOrder = tasks.reduce((max, task) => {
    if (!task.id.startsWith(`${sessionId}-task-`)) {
      return max;
    }

    const suffix = task.id.slice(`${sessionId}-task-`.length);
    const order = Number(suffix);

    return Number.isFinite(order) ? Math.max(max, order) : max;
  }, 0);

  return `${sessionId}-task-${maxOrder + 1}`;
}
