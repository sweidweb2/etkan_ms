import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { getSessionAuthIdentity } from "@/services/auth/auth.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { resolveDisplayName } from "@/services/auth/user-display.service";
import { recordBackupHistory } from "@/services/backup/backup-history.service";
import {
  buildStorageFilesZipForBackup,
  getBackupStorageExportUnauthorized,
} from "@/services/backup/backup-storage.service";

export async function GET() {
  const sessionClient = await createSupabaseServerActionClient();
  const identity = await getSessionAuthIdentity(sessionClient);
  const user = identity?.user ?? null;

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const adminClient = createSupabaseAdminClient();

  const exportUnauthorized = await getBackupStorageExportUnauthorized(
    adminClient,
    user.id
  );
  if (exportUnauthorized) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const downloadUnauthorized = await getUnauthorizedError(
    adminClient,
    user.id,
    PERMISSIONS.BACKUP_DOWNLOAD
  );
  if (downloadUnauthorized) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const createdByLabel = await resolveDisplayName(sessionClient, user);

  try {
    const result = await buildStorageFilesZipForBackup(adminClient);

    await recordBackupHistory(adminClient, {
      createdBy: user.id,
      createdByLabel,
      scope: "storage",
      tableName: null,
      fileName: result.fileName,
      rowCount: result.listing.files.length,
      tableCount: result.listing.buckets.length,
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "X-Backup-File-Count": String(result.listing.files.length),
        "X-Backup-File-Failed": String(result.failedCount),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to export storage files.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
