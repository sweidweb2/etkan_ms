

export function resolveClassReturnPath(
  returnTo: string,
  classId: string,
  fallback: (id: string) => string
): string {
  const trimmed = returnTo.trim();
  if (
    trimmed.startsWith("/teacher/classes/") ||
    trimmed.startsWith("/manager/classes/")
  ) {
    return trimmed;
  }
  return fallback(classId);
}
