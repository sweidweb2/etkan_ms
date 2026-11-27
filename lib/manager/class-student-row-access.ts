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

type RemoveEligibilityRow = {
  can_remove_student?: boolean;
  has_pending_drop?: boolean;
  has_semester_spp_payments?: boolean;
};

/** Server already encodes remove rules on `can_remove_student`. */
export function canRemoveClassStudent(row: RemoveEligibilityRow): boolean {
  return row.can_remove_student !== false;
}

/** Tooltip copy for a disabled remove control. */
export function classStudentRemoveBlockedReason(
  row: RemoveEligibilityRow
): string | null {
  if (canRemoveClassStudent(row)) {
    return null;
  }
  if (row.has_pending_drop) {
    return "Remove is blocked while a semester drop is pending";
  }
  if (row.has_semester_spp_payments) {
    return "Remove is blocked when the semester SPP has payments — use Drop semester";
  }
  return "Remove is blocked";
}
