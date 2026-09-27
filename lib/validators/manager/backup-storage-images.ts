import { z } from "zod";
import {
  BACKUP_STORAGE_BUCKETS,
  isSafeStorageObjectPath,
} from "@/lib/constants/backup-storage";

export const backupStorageImageFileQuerySchema = z.object({
  bucket: z.enum(BACKUP_STORAGE_BUCKETS, {
    message: "Invalid storage bucket.",
  }),
  path: z
    .string()
    .trim()
    .min(1, { message: "Storage path is required." })
    .max(1024, { message: "Storage path is too long." })
    .refine(isSafeStorageObjectPath, {
      message: "Invalid storage path.",
    }),
});

export type BackupStorageImageFileQuery = z.infer<
  typeof backupStorageImageFileQuerySchema
>;

export function parseBackupStorageImageFileQuery(
  bucket: string | null,
  path: string | null
):
  | { success: true; data: BackupStorageImageFileQuery }
  | { success: false; error: string } {
  const parsed = backupStorageImageFileQuerySchema.safeParse({
    bucket,
    path,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid storage file request.",
    };
  }

  return { success: true, data: parsed.data };
}
