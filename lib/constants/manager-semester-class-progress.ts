import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";
import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";

export function getClassSessionCompletionRate(
  classRow: ManagerSemesterClassRow
): number {
  if (classRow.subject_nb_sessions <= 0) {
    return 0;
  }

  const rate =
    (classRow.completed_sessions / classRow.subject_nb_sessions) * 100;

  return Math.min(100, Math.max(0, Math.round(rate)));
}

export function isActiveSemesterClass(classRow: ManagerSemesterClassRow): boolean {
  return classRow.status === CLASS_STATUSES.IN_PROGRESS;
}

export function getSemesterSessionProgressSummary(
  classes: ManagerSemesterClassRow[]
) {
  const totalSessions = classes.reduce(
    (sum, classRow) => sum + classRow.subject_nb_sessions,
    0
  );
  const completedSessions = classes.reduce(
    (sum, classRow) => sum + classRow.completed_sessions,
    0
  );
  const overallRate =
    totalSessions === 0
      ? 0
      : Math.round((completedSessions / totalSessions) * 100);

  return {
    totalSessions,
    completedSessions,
    overallRate,
    classCount: classes.length,
  };
}

export function getClassProgressTone(classRow: ManagerSemesterClassRow): {
  fillClassName: string;
  ringClassName: string;
  dotClassName: string;
} {
  const rate = getClassSessionCompletionRate(classRow);

  switch (classRow.status) {
    case CLASS_STATUSES.DONE:
      return {
        fillClassName: "bg-emerald-500",
        ringClassName: "border-emerald-500",
        dotClassName: "border-emerald-500 bg-card",
      };
    case CLASS_STATUSES.IN_PROGRESS:
      if (rate > 0) {
        return {
          fillClassName: "bg-emerald-500",
          ringClassName: "border-emerald-500",
          dotClassName: "border-emerald-500 bg-card",
        };
      }

      return {
        fillClassName: "bg-sky-500",
        ringClassName: "border-sky-500",
        dotClassName: "border-sky-500 bg-card",
      };
    case CLASS_STATUSES.SCHEDULED:
      return {
        fillClassName: "bg-violet-500",
        ringClassName: "border-violet-500",
        dotClassName: "border-violet-500 bg-card",
      };
    case CLASS_STATUSES.PAUSED:
      return {
        fillClassName: "bg-amber-500",
        ringClassName: "border-amber-500",
        dotClassName: "border-amber-500 bg-card",
      };
    case CLASS_STATUSES.STOPPED:
      return {
        fillClassName: "bg-rose-500",
        ringClassName: "border-rose-500",
        dotClassName: "border-rose-500 bg-card",
      };
    default:
      return {
        fillClassName: "bg-muted-foreground/30",
        ringClassName: "border-muted-foreground/45",
        dotClassName: "border-muted-foreground/45 bg-card",
      };
  }
}

/** @deprecated Use getClassProgressTone for status-aware styling. */
export function getSessionProgressTone(rate: number): {
  fillClassName: string;
  ringClassName: string;
  dotClassName: string;
} {
  if (rate > 0) {
    return {
      fillClassName: "bg-emerald-500",
      ringClassName: "border-emerald-500",
      dotClassName: "border-emerald-500 bg-card",
    };
  }

  return {
    fillClassName: "bg-muted-foreground/30",
    ringClassName: "border-muted-foreground/45",
    dotClassName: "border-muted-foreground/45 bg-card",
  };
}

export function getSegmentProgressTone(
  classRow: ManagerSemesterClassRow,
  _segmentIndex?: number
): ReturnType<typeof getClassProgressTone> {
  return getClassProgressTone(classRow);
}
