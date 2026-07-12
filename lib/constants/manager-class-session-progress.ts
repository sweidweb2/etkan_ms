import {
  getClassProgressTone,
  type ClassSessionProgressSource,
} from "@/lib/constants/manager-semester-class-progress";
import {
  getSessionTimingLabel,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";

export type ClassSessionSlot = {
  nb_order: number;
  session: ManagerClassSessionRow | null;
};

export function buildClassSessionSlots(
  classRow: Pick<ClassSessionProgressSource, "subject_nb_sessions">,
  sessions: ManagerClassSessionRow[]
): ClassSessionSlot[] {
  const sessionsByOrder = new Map(
    sessions.map((session) => [session.nb_order, session])
  );

  return Array.from({ length: classRow.subject_nb_sessions }, (_, index) => ({
    nb_order: index + 1,
    session: sessionsByOrder.get(index + 1) ?? null,
  }));
}

export function getClassSessionSlotSummary(classRow: ClassSessionProgressSource) {
  const totalSessions = classRow.subject_nb_sessions;
  const completedSessions = classRow.completed_sessions;
  const overallRate =
    totalSessions === 0
      ? 0
      : Math.round((completedSessions / totalSessions) * 100);

  return {
    totalSessions,
    completedSessions,
    overallRate,
  };
}

export function isSessionSlotFilled(slot: ClassSessionSlot): boolean {
  return slot.session !== null;
}

export function getSessionSlotProgressTone(
  session: ManagerClassSessionRow | null,
  classRow: ClassSessionProgressSource
): {
  fillClassName: string;
  ringClassName: string;
  dotClassName: string;
} {
  if (!session) {
    return getClassProgressTone(classRow);
  }

  const timingLabel = getSessionTimingLabel(session);

  switch (timingLabel) {
    case "completed":
      return {
        fillClassName: "bg-emerald-500",
        ringClassName: "border-emerald-500",
        dotClassName: "border-emerald-500 bg-card",
      };
    case "in_progress":
      return {
        fillClassName: "bg-amber-500",
        ringClassName: "border-amber-500",
        dotClassName: "border-amber-500 bg-card",
      };
    case "upcoming":
      return {
        fillClassName: "bg-sky-500",
        ringClassName: "border-sky-500",
        dotClassName: "border-sky-500 bg-card",
      };
    default:
      return getClassProgressTone(classRow);
  }
}

export function getSessionSlotCheckpointTone(
  slots: ClassSessionSlot[],
  checkpointIndex: number,
  classRow: ClassSessionProgressSource
): string {
  if (slots.length === 0) {
    return getClassProgressTone(classRow).dotClassName;
  }

  if (checkpointIndex === 0) {
    return getSessionSlotProgressTone(slots[0].session, classRow).dotClassName;
  }

  if (checkpointIndex === slots.length) {
    return getSessionSlotProgressTone(
      slots[slots.length - 1].session,
      classRow
    ).dotClassName;
  }

  const previousSlot = slots[checkpointIndex - 1];
  const nextSlot = slots[checkpointIndex];

  if (isSessionSlotFilled(previousSlot)) {
    return getSessionSlotProgressTone(previousSlot.session, classRow).dotClassName;
  }

  if (isSessionSlotFilled(nextSlot)) {
    return getSessionSlotProgressTone(nextSlot.session, classRow).dotClassName;
  }

  return getClassProgressTone(classRow).dotClassName;
}
