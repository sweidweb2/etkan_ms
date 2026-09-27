import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { getSessionAuthIdentity } from "@/services/auth/auth.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { resolveDisplayName } from "@/services/auth/user-display.service";
import { recordBackupHistory } from "@/services/backup/backup-history.service";
import {
  exportAuthSettingsBackup,
  getBackupAuthSettingsExportUnauthorized,
} from "@/services/backup/backup-auth-settings.service";

export async function GET() {
  const sessionClient = await createSupabaseServerActionClient();
  const identity = await getSessionAuthIdentity(sessionClient);
  const user = identity?.user ?? null;

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const adminClient = createSupabaseAdminClient();
  const exportUnauthorized = await getBackupAuthSettingsExportUnauthorized(
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
    const file = await exportAuthSettingsBackup();

    await recordBackupHistory(adminClient, {
      createdBy: user.id,
      createdByLabel,
      scope: "auth_settings",
      tableName: null,
      fileName: file.fileName,
      rowCount: file.complete ? 1 : 0,
      tableCount: 0,
    });

    return new NextResponse(file.body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "X-Backup-Auth-Settings-Complete": file.complete ? "1" : "0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to export dashboard auth settings.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
