import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const STUDENT_TASK_COLUMNS =
  "id, task_id, student_id, status, submitted_at, grade, notes, graded_at";

const DONE_TASK_STATUSES = [
  STUDENT_TASK_STATUSES.SUBMITTED,
  STUDENT_TASK_STATUSES.GRADED,
  STUDENT_TASK_STATUSES.LATE,
] as const;

export type StudentTaskRecord = {
  id: string;
  task_id: string;
  student_id: string;
  status: string;
  submitted_at: string | null;
  grade: number | null;
  notes: string | null;
  graded_at: string | null;
};

export type CreateStudentTaskInput = {
  task_id: string;
  student_id: string;
  status?: string;
};

export type UpdateStudentTaskInput = {
  status: string;
  grade?: number | null;
  notes?: string | null;
  submitted_at?: string | null;
  graded_at?: string | null;
};

export async function countStudentTasksByStudentId(
  client: Supabase,
  studentId: string
) {
  return client
    .from("student_tasks")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);
}

export async function countStudentTasksDoneByStudentId(
  client: Supabase,
  studentId: string
) {
  return client
    .from("student_tasks")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .in("status", [...DONE_TASK_STATUSES]);
}

export async function listStudentTasksByTaskId(
  client: Supabase,
  taskId: string
) {
  return client
    .from("student_tasks")
    .select(STUDENT_TASK_COLUMNS)
    .eq("task_id", taskId);
}

export async function findStudentTaskById(client: Supabase, id: string) {
  return client
    .from("student_tasks")
    .select(STUDENT_TASK_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createStudentTasks(
  client: Supabase,
  rows: CreateStudentTaskInput[]
) {
  if (rows.length === 0) {
    return { data: [] as StudentTaskRecord[], error: null };
  }

  return client
    .from("student_tasks")
    .insert(
      rows.map((row) => ({
        task_id: row.task_id,
        student_id: row.student_id,
        status: row.status ?? STUDENT_TASK_STATUSES.PENDING,
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
      }))
    )
    .select(STUDENT_TASK_COLUMNS);
}

export async function updateStudentTask(
  client: Supabase,
  id: string,
  input: UpdateStudentTaskInput
) {
  return client
    .from("student_tasks")
    .update({
      status: input.status,
      grade: input.grade ?? null,
      notes: input.notes ?? null,
      submitted_at: input.submitted_at ?? null,
      graded_at: input.graded_at ?? null,
    })
    .eq("id", id)
    .select(STUDENT_TASK_COLUMNS)
    .single();
}
