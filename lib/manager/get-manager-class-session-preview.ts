import { getManagerClassSessionsPreview } from "@/lib/constants/manager-class-sessions-mock";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";

export function getManagerClassSessionPreview(
  classId: string,
  sessionId: string
): ManagerClassSessionRow | null {
  const sessions = getManagerClassSessionsPreview(classId);

  return (
    sessions.find(
      (session) => session.id === sessionId && session.class_id === classId
    ) ?? null
  );
}
