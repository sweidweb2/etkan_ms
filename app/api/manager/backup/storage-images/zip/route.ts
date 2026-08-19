import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth/auth.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  buildStorageImagesZipForBackup,
  getBackupStorageExportUnauthorized,
} from "@/services/backup/backup-storage.service";

export async function GET() {
  const sessionClient = await createSupabaseServerActionClient();
  const user = await getCurrentUser(sessionClient);

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
    const result = await buildStorageImagesZipForBackup(adminClient);

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "X-Backup-Image-Count": String(result.listing.files.length),
        "X-Backup-Image-Failed": String(result.failedCount),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to export storage images.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
