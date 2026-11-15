import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runScheduledDatabaseSqlBackup } from "@/services/backup/scheduled-database-backup.service";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  return header.slice("Bearer ".length) === secret;
}

/**
 * Weekly SQL database backup (public tables + auth users) → Storage.
 * Secured with `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const adminClient = createSupabaseAdminClient();
    const result = await runScheduledDatabaseSqlBackup(adminClient);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database backup failed.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
