import { PROJECTS_STORAGE_BUCKET } from "@/lib/manager/projects/storage-path";
import { WORKSHOPS_STORAGE_BUCKET } from "@/lib/manager/workshops/storage-path";
import { REGISTRATION_STORAGE_BUCKET } from "@/lib/public/registration/storage-path";

export const BACKUP_STORAGE_BUCKETS = [
  PROJECTS_STORAGE_BUCKET,
  WORKSHOPS_STORAGE_BUCKET,
  REGISTRATION_STORAGE_BUCKET,
] as const;

export type BackupStorageBucket = (typeof BACKUP_STORAGE_BUCKETS)[number];

export const BACKUP_STORAGE_BUCKET_LABELS: Record<BackupStorageBucket, string> =
  {
    [PROJECTS_STORAGE_BUCKET]: "Projects",
    [WORKSHOPS_STORAGE_BUCKET]: "Workshops",
    [REGISTRATION_STORAGE_BUCKET]: "Registration",
  };

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
  ".bmp",
] as const;

export function isBackupStorageBucket(
  value: string
): value is BackupStorageBucket {
  return BACKUP_STORAGE_BUCKETS.includes(value as BackupStorageBucket);
}

export function isSafeStorageObjectPath(path: string): boolean {
  if (!path || path.length > 1024) {
    return false;
  }

  if (path.startsWith("/") || path.includes("\\") || path.includes("..")) {
    return false;
  }

  const segments = path.split("/");
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== ".."
  );
}

export function isStorageImageFile(
  fileName: string,
  contentType?: string | null
): boolean {
  const mime = contentType?.trim().toLowerCase() ?? "";
  if (mime.startsWith("image/")) {
    return true;
  }

  const lowerName = fileName.trim().toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}
