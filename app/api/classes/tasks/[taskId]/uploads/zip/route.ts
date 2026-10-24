import { NextResponse } from "next/server";
import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildClassTaskStudentUploadsZipForActor } from "@/services/classes/student-task-uploads-export.service";

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { taskId } = await context.params;
  const actor = await getSessionAuditActor();

  if (!actor.userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const adminClient = createSupabaseAdminClient();

  try {
    const result = await buildClassTaskStudentUploadsZipForActor(
      adminClient,
      actor,
      taskId
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
        "X-Export-File-Count": String(result.fileCount),
        "X-Export-File-Failed": String(result.failedCount),
        "X-Export-Student-Folders": String(result.studentFolderCount),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to export student task uploads.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
