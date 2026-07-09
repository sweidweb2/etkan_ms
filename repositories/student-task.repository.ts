import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const DONE_TASK_STATUSES = [
  STUDENT_TASK_STATUSES.SUBMITTED,
  STUDENT_TASK_STATUSES.GRADED,
  STUDENT_TASK_STATUSES.LATE,
] as const;

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
