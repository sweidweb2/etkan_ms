import type { BackupStorageBucket } from "@/lib/constants/backup-storage";

export interface BackupStorageFile {
  bucket: BackupStorageBucket;
  path: string;
  size: number | null;
  contentType: string | null;
}

export interface BackupStorageBucketSummary {
  bucket: BackupStorageBucket;
  label: string;
  fileCount: number;
  error: string | null;
}

export interface BackupStorageFileList {
  files: BackupStorageFile[];
  buckets: BackupStorageBucketSummary[];
}
