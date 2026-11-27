/**
 * Profile-backed actions (view / transfer / drop / grade detail links)
 * need a real `student_profiles.id`. Orphan enrollments use "".
 */
export function hasLinkedStudentProfile(
  studentProfileId: string | null | undefined
): boolean {
  return typeof studentProfileId === "string" && studentProfileId.length > 0;
}

/** Stable list key — prefer user_id so empty profile ids cannot collide. */
export function classStudentRowKey(row: {
  user_id: string;
  id?: string;
}): string {
  return row.user_id || row.id || "";
}
