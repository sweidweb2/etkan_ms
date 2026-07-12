import {
  SESSION_GROUP_GRADE_LEVEL_LABELS,
  SESSION_GROUP_GRADE_LEVEL_ORDER,
} from "@/lib/constants/manager-session-group-grade-display";
import {
  SESSION_GROUP_GRADE_LEVELS,
  type SessionGroupGradeLevelValue,
} from "@/types/manager-session-group-grade";

export type ClassSessionGroupGradePoint = {
  session_label: string;
  nb_order: number;
  group_grade_level: SessionGroupGradeLevelValue;
  group_grade_label: string;
  group_grade_index: number;
};

export type StudentSessionGroupGradeSlot = ClassSessionGroupGradePoint & {
  session_id: string;
  session_at: string;
};

export function mapSessionGroupGradeLevel(
  value: string | null | undefined
): SessionGroupGradeLevelValue | null {
  if (
    value === SESSION_GROUP_GRADE_LEVELS.VERY_LOW ||
    value === SESSION_GROUP_GRADE_LEVELS.LOW ||
    value === SESSION_GROUP_GRADE_LEVELS.MEDIUM ||
    value === SESSION_GROUP_GRADE_LEVELS.HIGH ||
    value === SESSION_GROUP_GRADE_LEVELS.VERY_HIGH
  ) {
    return value;
  }

  return null;
}

export function getGroupGradeLevelIndex(level: SessionGroupGradeLevelValue) {
  return SESSION_GROUP_GRADE_LEVEL_ORDER.indexOf(level);
}

export function buildStudentGroupGradeSlots(
  sessions: Array<{
    id: string;
    nb_order: number;
    starts_at: string;
    group_grade_level: string | null;
  }>
): StudentSessionGroupGradeSlot[] {
  const points: StudentSessionGroupGradeSlot[] = [];

  for (const session of [...sessions].sort(
    (left, right) => left.nb_order - right.nb_order
  )) {
    const level = mapSessionGroupGradeLevel(session.group_grade_level);
    if (!level) {
      continue;
    }

    points.push({
      session_id: session.id,
      session_label: `S${session.nb_order}`,
      session_at: session.starts_at,
      nb_order: session.nb_order,
      group_grade_level: level,
      group_grade_label: SESSION_GROUP_GRADE_LEVEL_LABELS[level],
      group_grade_index: getGroupGradeLevelIndex(level),
    });
  }

  return points;
}

export function buildClassGroupGradeTrend(
  sessions: Array<{ nb_order: number; group_grade_level: string | null }>
): ClassSessionGroupGradePoint[] {
  const points: ClassSessionGroupGradePoint[] = [];

  for (const session of sessions) {
    const level = mapSessionGroupGradeLevel(session.group_grade_level);
    if (!level) {
      continue;
    }

    points.push({
      session_label: `S${session.nb_order}`,
      nb_order: session.nb_order,
      group_grade_level: level,
      group_grade_label: SESSION_GROUP_GRADE_LEVEL_LABELS[level],
      group_grade_index: getGroupGradeLevelIndex(level),
    });
  }

  return points;
}

export const GROUP_GRADE_LEVEL_Y_TICKS = SESSION_GROUP_GRADE_LEVEL_ORDER.map(
  (_, index) => index
);

export function formatGroupGradeLevelTick(value: number) {
  const level = SESSION_GROUP_GRADE_LEVEL_ORDER[value];
  return level ? SESSION_GROUP_GRADE_LEVEL_LABELS[level] : "";
}
