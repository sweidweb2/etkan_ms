import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  createBackupFilename,
  serializeBackupExport,
} from "@/lib/export/backup-serialize";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { parseBackupExportFormat } from "@/lib/validators/manager/backup-export";
import { getCurrentUser } from "@/services/auth.service";
import { getUnauthorizedError } from "@/services/authorization.service";
import { recordBackupHistory } from "@/services/backup-history.service";
import {
  exportFullDatabaseBackup,
  exportSingleTableBackup,
  isBackupTableName,
} from "@/services/backup.service";
import { resolveDisplayName } from "@/services/user-display.service";

function createBackupFileResponse(
  body: string | Uint8Array,
  contentType: string,
  fileName: string
) {
  const payload: BodyInit =
    typeof body === "string"
      ? body
      : new Blob([body as BlobPart], { type: contentType });

  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

export async function GET(request: Request) {
  const sessionClient = await createSupabaseServerActionClient();
  const user = await getCurrentUser(sessionClient);

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get("table");
  const parsedFormat = parseBackupExportFormat(searchParams.get("format"));

  if (!parsedFormat.success) {
    return NextResponse.json({ message: parsedFormat.error }, { status: 400 });
  }

  const format = parsedFormat.data;
  const adminClient = createSupabaseAdminClient();

  const exportPermission = tableName
    ? PERMISSIONS.BACKUP_EXPORT_TABLE
    : PERMISSIONS.BACKUP_EXPORT_FULL;

  const unauthorized = await getUnauthorizedError(
    adminClient,
    user.id,
    exportPermission
  );
  if (unauthorized) {
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
    if (tableName) {
      if (!isBackupTableName(tableName)) {
        return NextResponse.json(
          { message: "Invalid table selected for export." },
          { status: 400 }
        );
      }

      const payload = await exportSingleTableBackup(adminClient, tableName);
      const file = await serializeBackupExport(payload, format);
      const fileName = createBackupFilename({
        scope: "table",
        tableName,
        extension: file.extension,
      });

      await recordBackupHistory(adminClient, {
        createdBy: user.id,
        createdByLabel,
        scope: "table",
        tableName,
        fileName,
        rowCount: payload.rows.length,
        tableCount: 1,
      });

      return createBackupFileResponse(file.body, file.contentType, fileName);
    }

    const payload = await exportFullDatabaseBackup(adminClient);
    const file = await serializeBackupExport(payload, format);
    const fileName = createBackupFilename({
      scope: "all",
      extension: file.extension,
    });
    const tableCount = Object.keys(payload.tables).length;
    const rowCount = Object.values(payload.tables).reduce(
      (total, rows) => total + rows.length,
      0
    );

    await recordBackupHistory(adminClient, {
      createdBy: user.id,
      createdByLabel,
      scope: "all",
      fileName,
      rowCount,
      tableCount,
    });

    return createBackupFileResponse(file.body, file.contentType, fileName);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to export backup.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
