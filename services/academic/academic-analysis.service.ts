import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  CLASS_STATUSES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import * as academicAnalysisRepository from "@/repositories/academic-analysis.repository";
import { assertPermission } from "@/services/auth/authorization.service";
import type { ManagerAcademicAnalysisData } from "@/types/manager-academic-analysis";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

function mapClassStatus(status: string | null): ClassStatusValue {
  if (
    status === CLASS_STATUSES.SCHEDULED ||
    status === CLASS_STATUSES.IN_PROGRESS ||
    status === CLASS_STATUSES.DONE ||
    status === CLASS_STATUSES.PAUSED ||
    status === CLASS_STATUSES.STOPPED
  ) {
    return status;
  }
  return CLASS_STATUSES.SCHEDULED;
}

export async function getAcademicAnalysisForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerAcademicAnalysisData> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACADEMIC_ANALYSIS_VIEW
  );

  const [countsResult, seriesResult] = await Promise.all([
    academicAnalysisRepository.academicAnalysisStudentCounts(adminClient),
    academicAnalysisRepository.listClassSessionProgress(adminClient),
  ]);

  if (countsResult.error) {
    throw new Error(countsResult.error.message);
  }
  if (seriesResult.error) {
    throw new Error(seriesResult.error.message);
  }

  const counts = countsResult.data;
  const classSessionSeries = (seriesResult.data ?? [])
    .map((row) => ({
      classId: row.class_id,
      className: row.class_name,
      status: mapClassStatus(row.status),
      actualSessions: row.actual_sessions,
      plannedSessions: row.planned_sessions,
    }))
    .sort((a, b) => a.className.localeCompare(b.className));

  return {
    classCount: classSessionSeries.length,
    studentCounts: {
      active: counts?.active_count ?? 0,
      inactive: counts?.inactive_count ?? 0,
      total: counts?.total_count ?? 0,
    },
    classSessionSeries,
  };
}
