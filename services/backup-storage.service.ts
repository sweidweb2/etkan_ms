import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  BACKUP_STORAGE_BUCKETS,
  BACKUP_STORAGE_BUCKET_LABELS,
  isBackupStorageBucket,
  isSafeStorageObjectPath,
  isStorageImageFile,
  type BackupStorageBucket,
} from "@/lib/constants/backup-storage";
import * as backupStorageRepository from "@/repositories/backup-storage.repository";
import { getUnauthorizedError } from "@/services/authorization.service";
import type {
  BackupStorageImageFile,
  BackupStorageImageList,
} from "@/types/backup-storage";

type BackupStorageClient = Parameters<
  typeof backupStorageRepository.listStorageObjects
>[0];

const LIST_PAGE_SIZE = 100;
const PLACEHOLDER_OBJECT_NAME = ".emptyFolderPlaceholder";

export async function getBackupStorageExportUnauthorized(
  client: BackupStorageClient,
  userId: string | null
): Promise<string | null> {
  const storageDenied = await getUnauthorizedError(
    client,
    userId,
    PERMISSIONS.BACKUP_EXPORT_STORAGE
  );
  if (!storageDenied) {
    return null;
  }

  return getUnauthorizedError(client, userId, PERMISSIONS.BACKUP_EXPORT_FULL);
}

async function listAllObjectsInBucket(
  client: BackupStorageClient,
  bucket: BackupStorageBucket
): Promise<backupStorageRepository.StorageListedObject[]> {
  const files: backupStorageRepository.StorageListedObject[] = [];
  const folders = [""];

  while (folders.length > 0) {
    const folderPath = folders.shift() ?? "";
    let offset = 0;

    while (true) {
      const { data, error } = await backupStorageRepository.listStorageObjects(
        client,
        bucket,
        folderPath,
        { limit: LIST_PAGE_SIZE, offset }
      );

      if (error) {
        throw new Error(`Unable to list ${bucket} storage.`);
      }

      const items = data ?? [];
      if (items.length === 0) {
        break;
      }

      for (const item of items) {
        if (!item.name || item.name === PLACEHOLDER_OBJECT_NAME) {
          continue;
        }

        const isFolder = item.id === null;
        if (isFolder) {
          folders.push(item.path);
          continue;
        }

        files.push(item);
      }

      if (items.length < LIST_PAGE_SIZE) {
        break;
      }

      offset += LIST_PAGE_SIZE;
    }
  }

  return files;
}

export async function listStorageImagesForBackup(
  client: BackupStorageClient
): Promise<BackupStorageImageList> {
  const files: BackupStorageImageFile[] = [];
  const buckets: BackupStorageImageList["buckets"] = [];

  for (const bucket of BACKUP_STORAGE_BUCKETS) {
    try {
      const objects = await listAllObjectsInBucket(client, bucket);
      const imageFiles = objects
        .filter((item) => isStorageImageFile(item.name, item.contentType))
        .map((item) => ({
          bucket,
          path: item.path,
          size: item.size,
          contentType: item.contentType,
        }));

      files.push(...imageFiles);
      buckets.push({
        bucket,
        label: BACKUP_STORAGE_BUCKET_LABELS[bucket],
        fileCount: imageFiles.length,
        error: null,
      });
    } catch (error) {
      buckets.push({
        bucket,
        label: BACKUP_STORAGE_BUCKET_LABELS[bucket],
        fileCount: 0,
        error:
          error instanceof Error
            ? error.message
            : `Unable to list ${bucket} storage.`,
      });
    }
  }

  return { files, buckets };
}

export async function downloadStorageImageForBackup(
  client: BackupStorageClient,
  bucket: string,
  path: string
): Promise<Blob> {
  if (!isBackupStorageBucket(bucket) || !isSafeStorageObjectPath(path)) {
    throw new Error("Invalid storage image.");
  }

  const { data, error } = await backupStorageRepository.downloadStorageObject(
    client,
    bucket,
    path
  );

  if (error || !data) {
    throw new Error("Unable to download storage image.");
  }

  return data;
}
