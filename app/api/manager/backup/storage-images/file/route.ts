import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { parseBackupStorageImageFileQuery } from "@/lib/validators/manager/backup-storage-images";
import { getCurrentUser } from "@/services/auth/auth.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  downloadStorageImageForBackup,
  getBackupStorageExportUnauthorized,
} from "@/services/backup/backup-storage.service";

export async function GET(request: Request) {
  const sessionClient = await createSupabaseServerActionClient();
  const user = await getCurrentUser(sessionClient);

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseBackupStorageImageFileQuery(
    searchParams.get("bucket"),
    searchParams.get("path")
  );

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
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
    const blob = await downloadStorageImageForBackup(
      adminClient,
      parsed.data.bucket,
      parsed.data.path
    );
    const fileName = parsed.data.path.split("/").pop() ?? "image";
    const contentType = blob.type || "application/octet-stream";
    const payload = new Blob([await blob.arrayBuffer()], { type: contentType });

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to download storage image.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
