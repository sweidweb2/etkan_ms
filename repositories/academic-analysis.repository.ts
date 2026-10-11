import type { Json, Database } from "@/types/supabase";
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

export type AcademicAnalysisStudentRecord = {
  id: string;
  full_name: string;
  username: string | null;
  status: string;
};

export type AcademicAnalysisStudentPage = {
  total: number;
  page: number;
  page_size: number;
  students: AcademicAnalysisStudentRecord[];
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

function parseStudentRecord(value: Json): AcademicAnalysisStudentRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, Json | undefined>;
  if (typeof row.id !== "string" || typeof row.full_name !== "string") {
    return null;
  }

  return {
    id: row.id,
    full_name: row.full_name,
    username: typeof row.username === "string" ? row.username : null,
    status: typeof row.status === "string" ? row.status : "",
  };
}

export async function listAcademicAnalysisStudents(
  client: Supabase,
  input: {
    status: string | null;
    search: string | null;
    limit: number;
    offset: number;
  }
) {
  const { data, error } = await client.rpc("list_academic_analysis_students", {
    p_status: input.status,
    p_search: input.search,
    p_limit: input.limit,
    p_offset: input.offset,
  });

  if (error) {
    return { data: null as AcademicAnalysisStudentPage | null, error };
  }

  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, Json | undefined>)
      : {};
  const students = Array.isArray(payload.students)
    ? payload.students.flatMap((row) => {
        const parsed = parseStudentRecord(row);
        return parsed ? [parsed] : [];
      })
    : [];

  return {
    data: {
      total: asCount(payload.total),
      page: Math.max(1, asCount(payload.page) || 1),
      page_size: Math.max(1, asCount(payload.page_size) || input.limit),
      students,
    },
    error: null,
  };
}
