import type { SessionGroupGradeLevelValue } from "@/types/manager-session-group-grade";

/** sessions table row preview for manager class detail. */
export interface ManagerClassSessionRow {
  id: string;
  class_id: string;
  nb_order: number;
  topic: string;
  starts_at: string;
  ends_at: string;
  semester_id: string | null;
  group_grade_level: SessionGroupGradeLevelValue | null;
  created_at: string;
}

export type SessionTimingLabel = "upcoming" | "in_progress" | "completed";

export function getSessionTimingLabel(session: {
  starts_at: string;
  ends_at: string;
}): SessionTimingLabel {
  const now = Date.now();
  const start = new Date(session.starts_at).getTime();
  const end = new Date(session.ends_at).getTime();

  if (now < start) {
    return "upcoming";
  }

  if (now > end) {
    return "completed";
  }

  return "in_progress";
}

export function sortClassSessionsNewestFirst(
  sessions: ManagerClassSessionRow[]
): ManagerClassSessionRow[] {
  return [...sessions].sort((left, right) => {
    const orderCompare = right.nb_order - left.nb_order;

    if (orderCompare !== 0) {
      return orderCompare;
    }

    return (
      new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime()
    );
  });
}
