import { z } from "zod";
import {
  BACKUP_EXPORT_FORMATS,
  BACKUP_EXPORT_FORMAT_VALUES,
  type BackupExportFormat,
} from "@/lib/constants/backup-formats";

const backupExportFormatSchema = z.enum(BACKUP_EXPORT_FORMAT_VALUES);

export function parseBackupExportFormat(
  value: string | null
):
  | { success: true; data: BackupExportFormat }
  | { success: false; error: string } {
  if (!value) {
    return { success: true, data: BACKUP_EXPORT_FORMATS.JSON };
  }

  const parsed = backupExportFormatSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid backup format. Choose JSON, SQL, or CSV.",
    };
  }

  return { success: true, data: parsed.data };
}
