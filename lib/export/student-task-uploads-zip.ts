/**
 * ZIP path helpers for class-task student upload exports.
 * Layout: `{taskTitle}/{studentName}/{fileName}`
 */

const MAX_SEGMENT_LENGTH = 120;

/** Safe single path segment for ZIP entries (no slashes / control chars). */
export function sanitizeZipPathSegment(value: string): string {
  const cleaned = value
    .replace(/[\\/]+/g, "-")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/^-+/, "")
    .replace(/[. -]+$/g, "");

  const fallback = cleaned.length > 0 ? cleaned : "untitled";
  return fallback.slice(0, MAX_SEGMENT_LENGTH);
}

export function slugifyZipNamePart(value: string): string {
  const slug =
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "task";
  return slug.slice(0, MAX_SEGMENT_LENGTH);
}

export function getStudentTaskUploadsZipFilename(taskTitle: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${slugifyZipNamePart(taskTitle)}-student-uploads-${date}.zip`;
}

/**
 * Deduplicate folder/file names within a sibling set (case-insensitive).
 * First use keeps the base; later uses append ` (2)`, ` (3)`, …
 */
export function uniqueZipSiblingName(
  baseName: string,
  usedLowerNames: Map<string, number>
): string {
  const key = baseName.toLowerCase();
  const count = usedLowerNames.get(key) ?? 0;
  usedLowerNames.set(key, count + 1);

  if (count === 0) {
    return baseName;
  }

  return `${baseName} (${count + 1})`;
}

export function buildStudentTaskUploadZipEntryPath(input: {
  rootFolder: string;
  studentFolder: string;
  fileName: string;
}): string {
  return `${input.rootFolder}/${input.studentFolder}/${input.fileName}`;
}
