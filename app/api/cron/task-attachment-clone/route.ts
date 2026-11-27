import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/ops/cron-auth";
import { logOpsError, logOpsWarn } from "@/lib/ops/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processPendingTaskAttachmentCloneJobs } from "@/services/classes/task-attachment-clone.service";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Drain pending task-attachment clone jobs (safety net for request-scoped
 * after-response processing). Secured with `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    logOpsWarn("cron/task-attachment-clone", "Unauthorized cron request");
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const adminClient = createSupabaseAdminClient();
    await processPendingTaskAttachmentCloneJobs(adminClient);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logOpsError("cron/task-attachment-clone", error);
    return NextResponse.json(
      { message: "Task attachment clone processing failed." },
      { status: 500 }
    );
  }
}
