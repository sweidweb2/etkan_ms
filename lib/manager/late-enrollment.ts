/** True when dueDate parses to a time strictly before `now`. Null/invalid → false. */
export function isDueDatePast(
  dueDate: string | null,
  now: Date = new Date()
): boolean {
  if (!dueDate) {
    return false;
  }

  const dueMs = new Date(dueDate).getTime();
  if (Number.isNaN(dueMs)) {
    return false;
  }

  return dueMs < now.getTime();
}
