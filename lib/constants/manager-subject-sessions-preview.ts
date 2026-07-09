/** Preview lookup: class subject_name → subjects row fields including nb_sessions. */
const SUBJECT_SESSIONS_BY_LABEL: Record<
  string,
  { subject_id: string; nb_sessions: number }
> = {
  Mathematics: { subject_id: "sub-001-math-advanced", nb_sessions: 10 },
  English: { subject_id: "sub-005-english", nb_sessions: 12 },
  Physics: { subject_id: "sub-002-physics", nb_sessions: 10 },
  Chemistry: { subject_id: "sub-003-chemistry", nb_sessions: 10 },
  Biology: { subject_id: "sub-004-biology", nb_sessions: 10 },
  "Computer Science": { subject_id: "sub-008-computer-science", nb_sessions: 14 },
  "Fine Arts": { subject_id: "sub-009-art", nb_sessions: 8 },
  Sports: { subject_id: "sub-014-pe", nb_sessions: 10 },
  History: { subject_id: "sub-007-history", nb_sessions: 10 },
  Music: { subject_id: "sub-010-music", nb_sessions: 8 },
  Arabic: { subject_id: "sub-006-arabic", nb_sessions: 10 },
  "Social Studies": { subject_id: "sub-011-economics", nb_sessions: 10 },
  Languages: { subject_id: "sub-006-arabic", nb_sessions: 10 },
};

const DEFAULT_SUBJECT = {
  subject_id: "sub-preview-default",
  nb_sessions: 10,
};

export function getSubjectSessionsPreview(subjectName: string) {
  return SUBJECT_SESSIONS_BY_LABEL[subjectName] ?? DEFAULT_SUBJECT;
}

/** Deterministic mock: completed sessions for a class within subject total. */
export function getMockClassCompletedSessions(
  classId: string,
  subjectNbSessions: number
): number {
  if (subjectNbSessions <= 0) {
    return 0;
  }

  let hash = 0;
  for (const character of classId) {
    hash = (hash + character.charCodeAt(0)) % 997;
  }

  const ratio = (hash % 91) / 100;
  const completed = Math.round(subjectNbSessions * ratio);

  return Math.min(subjectNbSessions, Math.max(0, completed));
}
