import { NextResponse } from "next/server";
import { getSessionAuditActor } from "@/lib/auth/session";
import { logOpsError } from "@/lib/ops/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildGradeCertificatesZipForActor } from "@/services/classes/grade-certificates-export.service";

type RouteContext = {
  params: Promise<{ classId: string }>;
};

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Server-built ZIP of computed grade certificates for a class.
 * Secured via session + GRADES_EXPORT_CERTIFICATES (inside the service).
 */
export async function GET(_request: Request, context: RouteContext) {
  const { classId } = await context.params;
  const actor = await getSessionAuditActor();

  if (!actor.userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const adminClient = createSupabaseAdminClient();

  try {
    const result = await buildGradeCertificatesZipForActor(
      adminClient,
      actor.userId,
      classId
    );

    if (!result.success) {
      return NextResponse.json(
        { message: result.error },
        { status: result.status }
      );
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "X-Export-Certificate-Count": String(result.count),
      },
    });
  } catch (error) {
    logOpsError("api/classes/grade-certificates/zip", error, { classId });
    return NextResponse.json(
      { message: "Unable to export grade certificates." },
      { status: 500 }
    );
  }
}
