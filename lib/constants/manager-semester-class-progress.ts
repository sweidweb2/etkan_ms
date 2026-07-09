import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";

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
  return classRow.status === "active";
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

  if (!isActiveSemesterClass(classRow)) {
    return {
      fillClassName: "bg-rose-500",
      ringClassName: "border-rose-500",
      dotClassName: "border-rose-500 bg-card",
    };
  }

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
