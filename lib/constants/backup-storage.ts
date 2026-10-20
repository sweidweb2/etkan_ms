import {
  AUTHOR_STORAGE_BUCKET,
  BLOGS_STORAGE_BUCKET,
} from "@/lib/manager/blogs/storage-path";
import { GALLERY_STORAGE_BUCKET } from "@/lib/manager/gallery/storage-path";
import { PROJECTS_STORAGE_BUCKET } from "@/lib/manager/projects/storage-path";
import { WORKSHOPS_STORAGE_BUCKET } from "@/lib/manager/workshops/storage-path";
import { REGISTRATION_STORAGE_BUCKET } from "@/lib/public/registration/storage-path";
import { CLASS_COVERS_STORAGE_BUCKET } from "@/lib/manager/classes/storage-path";
import { STUDENT_TASK_UPLOADS_STORAGE_BUCKET } from "@/lib/constants/manager-student-task-uploads";

export const BACKUP_STORAGE_BUCKETS = [
  PROJECTS_STORAGE_BUCKET,
  BLOGS_STORAGE_BUCKET,
  AUTHOR_STORAGE_BUCKET,
  WORKSHOPS_STORAGE_BUCKET,
  REGISTRATION_STORAGE_BUCKET,
  STUDENT_TASK_UPLOADS_STORAGE_BUCKET,
  GALLERY_STORAGE_BUCKET,
  CLASS_COVERS_STORAGE_BUCKET,
] as const;

export type BackupStorageBucket = (typeof BACKUP_STORAGE_BUCKETS)[number];

export const BACKUP_STORAGE_BUCKET_LABELS: Record<BackupStorageBucket, string> =
  {
    [PROJECTS_STORAGE_BUCKET]: "Projects",
    [BLOGS_STORAGE_BUCKET]: "Blogs",
    [AUTHOR_STORAGE_BUCKET]: "Blog authors",
    [WORKSHOPS_STORAGE_BUCKET]: "Workshops",
    [REGISTRATION_STORAGE_BUCKET]: "Registration",
    [STUDENT_TASK_UPLOADS_STORAGE_BUCKET]: "Student task uploads",
    [GALLERY_STORAGE_BUCKET]: "Gallery",
    [CLASS_COVERS_STORAGE_BUCKET]: "Class covers",
  };

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
