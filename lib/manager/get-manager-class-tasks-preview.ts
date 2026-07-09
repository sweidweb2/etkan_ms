import { getManagerClassSessionTasksPreview } from "@/lib/constants/manager-class-session-detail-mock";
import { getManagerClassSessionsPreview } from "@/lib/constants/manager-class-sessions-mock";
import type { ManagerSessionTaskRow } from "@/types/manager-class-session-detail";

export type ManagerClassTaskWithSessionRow = ManagerSessionTaskRow & {
  session_label: string;
  session_nb_order: number;
};

export function getManagerClassTasksPreview(
  classId: string
): ManagerClassTaskWithSessionRow[] {
  const sessions = getManagerClassSessionsPreview(classId);
  const tasks: ManagerClassTaskWithSessionRow[] = [];

  for (const session of sessions) {
    const sessionTasks = getManagerClassSessionTasksPreview(classId, session.id);

    for (const task of sessionTasks) {
      tasks.push({
        ...task,
        session_label: `S${session.nb_order}`,
        session_nb_order: session.nb_order,
      });
    }
  }

  return tasks.sort((left, right) => {
    const sessionCompare = left.session_nb_order - right.session_nb_order;
    if (sessionCompare !== 0) {
      return sessionCompare;
    }

    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  });
}
