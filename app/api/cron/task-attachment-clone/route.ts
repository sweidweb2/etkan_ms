import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processPendingTaskAttachmentCloneJobs } from "@/services/classes/task-attachment-clone.service";

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
 * Drain pending task-attachment clone jobs (safety net for request-scoped
 * after-response processing). Secured with `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const adminClient = createSupabaseAdminClient();
    await processPendingTaskAttachmentCloneJobs(adminClient);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Task attachment clone processing failed.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
