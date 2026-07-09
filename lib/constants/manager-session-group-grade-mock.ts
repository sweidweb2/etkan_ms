import { getPreviewSessionGroupGradeFromStore } from "@/lib/preview/manager-session-group-grade-store";
import { SESSION_GROUP_GRADE_LEVEL_ORDER } from "@/lib/constants/manager-session-group-grade-display";
import type { SessionGroupGradeLevelValue } from "@/types/manager-session-group-grade";

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash + character.charCodeAt(0)) % 997;
  }

  return hash;
}

export function getSessionGroupGradePreview(
  sessionId: string,
  nbOrder: number
): SessionGroupGradeLevelValue | null {
  const stored = getPreviewSessionGroupGradeFromStore(sessionId);
  if (stored) {
    return stored;
  }

  if (nbOrder % 3 !== 0) {
    return null;
  }

  return SESSION_GROUP_GRADE_LEVEL_ORDER[hashString(sessionId) % SESSION_GROUP_GRADE_LEVEL_ORDER.length]!;
}
