import "server-only";

import { runWithBackupZipLimit } from "@/lib/concurrency/heavy-cpu";
import {
  buildComputedGradeCertificatesZipBytes,
  getGradeCertificatesZipFilename,
} from "@/lib/export/student-grade-certificates-zip-export";
import { isUuid } from "@/lib/shared/is-uuid";
import { listComputedStudentGradeSheetBundlesForManager } from "@/services/classes/student-course-grade-queries.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type GradeCertificatesZipResult =
  | {
      success: true;
      buffer: Buffer;
      fileName: string;
      count: number;
    }
  | {
      success: false;
      error: string;
      status: 400 | 403 | 404 | 500;
    };

/**
 * Authz + load computed bundles + build certificate ZIP on the server so the
 * browser never runs N× jsPDF + JSZip on the main thread.
 */
export async function buildGradeCertificatesZipForActor(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<GradeCertificatesZipResult> {
  if (!isUuid(classId)) {
    return { success: false, error: "Invalid class.", status: 400 };
  }

  try {
    const { classRow, bundles } =
      await listComputedStudentGradeSheetBundlesForManager(
        adminClient,
        actorUserId,
        classId
      );

    if (bundles.length === 0) {
      return {
        success: false,
        error: "No computed students are available to export.",
        status: 400,
      };
    }

    const { bytes, count } = await runWithBackupZipLimit(() =>
      buildComputedGradeCertificatesZipBytes({
        classRow,
        bundles,
      })
    );

    return {
      success: true,
      buffer: Buffer.from(bytes),
      fileName: getGradeCertificatesZipFilename(classRow.name),
      count,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to export grade certificates.";
    const status =
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("permission")
        ? 403
        : message.toLowerCase().includes("not found")
          ? 404
          : 500;
    return { success: false, error: message, status };
  }
}
