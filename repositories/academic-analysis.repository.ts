import "server-only";

import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

export type AcademicAnalysisStudentCounts = {
  active_count: number;
  inactive_count: number;
  total_count: number;
};

export type ClassSessionProgressRecord = {
  class_id: string;
  class_name: string;
  status: string;
  actual_sessions: number;
  planned_sessions: number;
};

function asCount(value: unknown): number {
  return Math.max(0, Number(value) || 0);
}

export async function academicAnalysisStudentCounts(client: Supabase) {
  const { data, error } = await client.rpc("academic_analysis_student_counts");

  if (error) {
    return { data: null as AcademicAnalysisStudentCounts | null, error };
  }

  const row = data?.[0];
  return {
    data: {
      active_count: asCount(row?.active_count),
      inactive_count: asCount(row?.inactive_count),
      total_count: asCount(row?.total_count),
    },
    error: null,
  };
}

export async function listClassSessionProgress(client: Supabase) {
  const { data, error } = await client.rpc("list_class_session_progress");

  if (error) {
    return { data: null as ClassSessionProgressRecord[] | null, error };
  }

  const rows: ClassSessionProgressRecord[] = [];
  for (const row of data ?? []) {
    if (!row.class_id || !row.class_name) {
      continue;
    }
    rows.push({
      class_id: row.class_id,
      class_name: row.class_name,
      status: row.status ?? "",
      actual_sessions: asCount(row.actual_sessions),
      planned_sessions: asCount(row.planned_sessions),
    });
  }

  return { data: rows, error: null };
}