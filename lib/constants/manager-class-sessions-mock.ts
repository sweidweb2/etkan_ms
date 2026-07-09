import { getManagerClassPreview } from "@/lib/manager/get-manager-class-preview";
import { getSessionGroupGradePreview } from "@/lib/constants/manager-session-group-grade-mock";
import { getSessionPhaseLinkPreview } from "@/lib/constants/manager-session-phase-link-mock";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";

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

export function getManagerClassSessionsPreview(
  classId: string
): ManagerClassSessionRow[] {
  const classRow = getManagerClassPreview(classId);
  const totalSessions = classRow.subject_nb_sessions;

  if (totalSessions <= 0) {
    return [];
  }

  const baseDate = new Date(classRow.created_at);

  const sessions = Array.from({ length: totalSessions }, (_, index) => {
    const nbOrder = index + 1;
    const startsAt = new Date(baseDate);
    startsAt.setDate(baseDate.getDate() + index * 7);
    startsAt.setHours(9 + (index % 4), (index % 2) * 30, 0, 0);

    const endsAt = new Date(startsAt);
    endsAt.setMinutes(endsAt.getMinutes() + 90);

    const createdAt = new Date(startsAt);
    createdAt.setDate(createdAt.getDate() - 3);
    const sessionId = `${classId}-session-${nbOrder}`;
    const phaseLink = getSessionPhaseLinkPreview(
      sessionId,
      nbOrder,
      classRow.semester_id
    );

    return {
      id: sessionId,
      class_id: classId,
      nb_order: nbOrder,
      topic: `Session ${nbOrder}`,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      semester_id: phaseLink?.phase_id ?? null,
      group_grade_level: getSessionGroupGradePreview(sessionId, nbOrder),
      created_at: createdAt.toISOString(),
    };
  });

  return sortClassSessionsNewestFirst(sessions);
}
