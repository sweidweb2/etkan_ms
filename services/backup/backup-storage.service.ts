import "server-only";

import JSZip from "jszip";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  BACKUP_STORAGE_BUCKETS,
  BACKUP_STORAGE_BUCKET_LABELS,
  isBackupStorageBucket,
  isSafeStorageObjectPath,
  type BackupStorageBucket,
} from "@/lib/constants/backup-storage";
import { runWithBackupZipLimit } from "@/lib/concurrency/heavy-cpu";
import * as backupStorageRepository from "@/repositories/backup-storage.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import type {
  BackupStorageFile,
  BackupStorageFileList,
} from "@/types/backup-storage";

type BackupStorageClient = Parameters<
  typeof backupStorageRepository.listStorageObjects
>[0];

const LIST_PAGE_SIZE = 100;
const PLACEHOLDER_OBJECT_NAME = ".emptyFolderPlaceholder";
const ZIP_DOWNLOAD_CONCURRENCY = 3;

function createStorageFilesZipName() {
  const dateStamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `backup-storage-files-${dateStamp}.zip`;
}

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

export async function listStorageFilesForBackup(
  client: BackupStorageClient
): Promise<BackupStorageFileList> {
  const bucketResults = await Promise.all(
    BACKUP_STORAGE_BUCKETS.map(async (bucket) => {
      try {
        const objects = await listAllObjectsInBucket(client, bucket);
        const bucketFiles = objects.map((item) => ({
          bucket,
          path: item.path,
          size: item.size,
          contentType: item.contentType,
        }));

        return {
          bucket,
          label: BACKUP_STORAGE_BUCKET_LABELS[bucket],
          fileCount: bucketFiles.length,
          error: null as string | null,
          bucketFiles,
        };
      } catch (error) {
        return {
          bucket,
          label: BACKUP_STORAGE_BUCKET_LABELS[bucket],
          fileCount: 0,
          error:
            error instanceof Error
              ? error.message
              : `Unable to list ${bucket} storage.`,
          bucketFiles: [] as BackupStorageFile[],
        };
      }
    })
  );

  const files: BackupStorageFile[] = [];
  const buckets: BackupStorageFileList["buckets"] = [];

  for (const result of bucketResults) {
    files.push(...result.bucketFiles);
    buckets.push({
      bucket: result.bucket,
      label: result.label,
      fileCount: result.fileCount,
      error: result.error,
    });
  }

  return { files, buckets };
}

export async function downloadStorageFileForBackup(
  client: BackupStorageClient,
  bucket: string,
  path: string
): Promise<Blob> {
  if (!isBackupStorageBucket(bucket) || !isSafeStorageObjectPath(path)) {
    throw new Error("Invalid storage file.");
  }

  const { data, error } = await backupStorageRepository.downloadStorageObject(
    client,
    bucket,
    path
  );

  if (error || !data) {
    throw new Error("Unable to download storage file.");
  }

  return data;
}

async function downloadStorageFilesIntoZip(
  client: BackupStorageClient,
  files: BackupStorageFile[],
  zip: JSZip,
  signal?: AbortSignal
): Promise<number> {
  let nextIndex = 0;
  let failedCount = 0;

  async function worker() {
    while (nextIndex < files.length) {
      if (signal?.aborted) {
        throw new DOMException("The export was cancelled.", "AbortError");
      }

      const current = nextIndex;
      nextIndex += 1;
      const file = files[current];
      if (!file) {
        continue;
      }

      try {
        const blob = await downloadStorageFileForBackup(
          client,
          file.bucket,
          file.path
        );
        zip.file(`${file.bucket}/${file.path}`, await blob.arrayBuffer());
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }
        failedCount += 1;
      }
    }
  }

  const workerCount = Math.min(ZIP_DOWNLOAD_CONCURRENCY, files.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return failedCount;
}

export async function buildStorageFilesZipForBackup(
  client: BackupStorageClient,
  signal?: AbortSignal
): Promise<{
  buffer: Buffer;
  fileName: string;
  listing: BackupStorageFileList;
  failedCount: number;
}> {
  const listing = await listStorageFilesForBackup(client);

  if (signal?.aborted) {
    throw new DOMException("The export was cancelled.", "AbortError");
  }

  const zip = new JSZip();
  const failedCount =
    listing.files.length === 0
      ? 0
      : await downloadStorageFilesIntoZip(client, listing.files, zip, signal);

  if (signal?.aborted) {
    throw new DOMException("The export was cancelled.", "AbortError");
  }

  const buffer = Buffer.from(
    await runWithBackupZipLimit(() =>
      zip.generateAsync({ type: "arraybuffer" })
    )
  );

  return {
    buffer,
    fileName: createStorageFilesZipName(),
    listing,
    failedCount,
  };
}
