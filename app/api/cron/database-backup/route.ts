import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/ops/cron-auth";
import { logOpsError, logOpsWarn } from "@/lib/ops/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runScheduledDatabaseSqlBackup } from "@/services/backup/scheduled-database-backup.service";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Weekly SQL database backup (public tables + auth users) → Storage.
 * Secured with `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    logOpsWarn("cron/database-backup", "Unauthorized cron request");
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const adminClient = createSupabaseAdminClient();
    const result = await runScheduledDatabaseSqlBackup(adminClient);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    logOpsError("cron/database-backup", error);
    return NextResponse.json(
      { message: "Database backup failed." },
      { status: 500 }
    );
  }
}
