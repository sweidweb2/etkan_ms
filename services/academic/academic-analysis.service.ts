import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  CLASS_STATUSES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import {
  STUDENT_STATUSES,
  STUDENT_STATUS_VALUES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import * as academicAnalysisRepository from "@/repositories/academic-analysis.repository";
import { assertPermission } from "@/services/auth/authorization.service";
import type {
  ManagerAcademicAnalysisData,
  ManagerAcademicAnalysisStudentRow,
  ManagerAcademicAnalysisStudentsPage,
} from "@/types/manager-academic-analysis";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const DEFAULT_STUDENT_PAGE_SIZE = 10;
const MAX_STUDENT_PAGE_SIZE = 25;

export type AcademicAnalysisStudentQuery = {
  page?: number;
  pageSize?: number;
  status?: string | null;
  search?: string | null;
};

function mapStudentStatus(status: string | null): StudentStatusValue {
  if (
    status === STUDENT_STATUSES.ACTIVE ||
    status === STUDENT_STATUSES.INACTIVE ||
    status === STUDENT_STATUSES.GRADUATED ||
    status === STUDENT_STATUSES.SUSPENDED
  ) {
    return status;
  }
  return STUDENT_STATUSES.ACTIVE;
}

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

function clampPage(page: number | undefined): number {
  if (!Number.isFinite(page) || page === undefined || page < 1) {
    return 1;
  }
  return Math.floor(page);
}

function clampPageSize(pageSize: number | undefined): number {
  if (!Number.isFinite(pageSize) || pageSize === undefined) {
    return DEFAULT_STUDENT_PAGE_SIZE;
  }
  return Math.min(MAX_STUDENT_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
}

function normalizeStatus(status: string | null | undefined): string | null {
  if (!status || status === "all") {
    return null;
  }
  return STUDENT_STATUS_VALUES.includes(status as StudentStatusValue)
    ? status
    : null;
}

function normalizeSearch(search: string | null | undefined): string | null {
  const cleaned = (search ?? "")
    .trim()
    .replace(/[%_\\]/g, "")
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : null;
}

async function loadStudentPage(
  adminClient: Supabase,
  query: AcademicAnalysisStudentQuery
): Promise<ManagerAcademicAnalysisStudentsPage> {
  const pageSize = clampPageSize(query.pageSize);
  const page = clampPage(query.page);
  const { data, error } =
    await academicAnalysisRepository.listAcademicAnalysisStudents(adminClient, {
      status: normalizeStatus(query.status),
      search: normalizeSearch(query.search),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

  if (error) {
    throw new Error(error.message);
  }

  const students: ManagerAcademicAnalysisStudentRow[] = (
    data?.students ?? []
  ).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    username: row.username,
    status: mapStudentStatus(row.status),
  }));

  return {
    students,
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.page_size ?? pageSize,
  };
}

export async function listAcademicAnalysisStudentsPageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  query: AcademicAnalysisStudentQuery
): Promise<ManagerAcademicAnalysisStudentsPage> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACADEMIC_ANALYSIS_VIEW
  );

  return loadStudentPage(adminClient, query);
}

export async function getAcademicAnalysisForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  query: AcademicAnalysisStudentQuery = {}
): Promise<ManagerAcademicAnalysisData> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACADEMIC_ANALYSIS_VIEW
  );

  const [countsResult, seriesResult, studentsPage] = await Promise.all([
    academicAnalysisRepository.academicAnalysisStudentCounts(adminClient),
    academicAnalysisRepository.listClassSessionProgress(adminClient),
    loadStudentPage(adminClient, query),
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
    studentsPage,
    classSessionSeries,
  };
}
