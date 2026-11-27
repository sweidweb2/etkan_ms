/**
 * Pure helpers for task-attachment clone idempotency.
 * Deterministic dest paths embed the source attachment id.
 */

export function isCloneSourceAlreadyCopied(
  sourceId: string,
  destPath: string,
  existing: ReadonlyArray<{ storage_path: string }>
): boolean {
  const idToken = `/${sourceId}-`;
  return existing.some(
    (row) =>
      row.storage_path === destPath || row.storage_path.includes(idToken)
  );
}

export function isDuplicateStoragePathError(
  message: string | undefined
): boolean {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("storage_path") &&
    (normalized.includes("duplicate") || normalized.includes("unique"))
  );
}
