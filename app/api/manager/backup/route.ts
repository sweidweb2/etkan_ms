import { NextResponse } from "next/server";
import { ROLES } from "@/lib/constants/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth.service";
import { recordBackupHistory } from "@/services/backup-history.service";
import {
  exportFullDatabaseBackup,
  exportSingleTableBackup,
  isBackupTableName,
} from "@/services/backup.service";
import { resolveDisplayName } from "@/services/user-display.service";
import { resolveUserRole } from "@/services/role.service";

function createBackupFilename(scope: "all" | "table", tableName?: string) {
  const dateStamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (scope === "table" && tableName) {
    return `backup-${tableName}-${dateStamp}.json`;
  }

  return `backup-all-tables-${dateStamp}.json`;
}

export async function GET(request: Request) {
  const sessionClient = await createSupabaseServerActionClient();
  const user = await getCurrentUser(sessionClient);

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const role = await resolveUserRole(sessionClient, user);

  if (role !== ROLES.MANAGER && role !== ROLES.ADMIN) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get("table");
  const adminClient = createSupabaseAdminClient();
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
      const fileName = createBackupFilename("table", tableName);

      await recordBackupHistory(adminClient, {
        createdBy: user.id,
        createdByLabel,
        scope: "table",
        tableName,
        fileName,
        rowCount: payload.rows.length,
        tableCount: 1,
      });

      return new NextResponse(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    const payload = await exportFullDatabaseBackup(adminClient);
    const fileName = createBackupFilename("all");
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

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to export backup.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
