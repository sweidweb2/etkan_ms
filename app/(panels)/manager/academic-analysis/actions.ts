"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listAcademicAnalysisStudentsPageForManager } from "@/services/academic/academic-analysis.service";
import type { ManagerAcademicAnalysisStudentsPage } from "@/types/manager-academic-analysis";

const EMPTY_PAGE: ManagerAcademicAnalysisStudentsPage = {
  students: [],
  total: 0,
  page: 1,
  pageSize: 10,
};

export async function loadAcademicAnalysisStudentsPageAction(input: {
  page: number;
  pageSize: number;
  status?: string;
  search?: string;
}): Promise<ManagerAcademicAnalysisStudentsPage> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return { ...EMPTY_PAGE, page: input.page, pageSize: input.pageSize };
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listAcademicAnalysisStudentsPageForManager(
      adminClient,
      actor.userId,
      input
    );
  } catch {
    return { ...EMPTY_PAGE, page: input.page, pageSize: input.pageSize };
  }
}
