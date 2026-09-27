import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { getSessionAuthIdentity } from "@/services/auth/auth.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  getBackupStorageExportUnauthorized,
  listStorageFilesForBackup,
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

  try {
    const payload = await listStorageFilesForBackup(adminClient);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to list storage files.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
