import * as classTaskRepository from "@/repositories/class-task.repository";
import type { ClassTaskRecord } from "@/repositories/class-task.repository";
import * as subjectTaskRepository from "@/repositories/subject-task.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/**
 * Clone all subject_tasks for `subjectId` onto `classId` as unstarted class_tasks.
 * Does not seed student_tasks (caller seeds when members exist).
 */
export async function cloneAllSubjectTasksToClass(
  adminClient: Supabase,
  classId: string,
  subjectId: string
): Promise<{ data: ClassTaskRecord[]; error: string | null }> {
  const subjectTasks = await subjectTaskRepository.listSubjectTasksBySubjectId(
    adminClient,
    subjectId
  );

  if (subjectTasks.error) {
    return { data: [], error: subjectTasks.error.message };
  }

  const rows = (subjectTasks.data ?? []).map((task) => ({
    class_id: classId,
    source_subject_task_id: task.id,
    title: task.title,
    description: task.description,
    period: task.period,
    max_grade: task.max_grade,
    sort_order: task.sort_order,
    started: false,
    started_at: null,
    due_date: null,
  }));

  const created = await classTaskRepository.createClassTasks(adminClient, rows);
  if (created.error) {
    return { data: [], error: created.error.message };
  }

  return { data: (created.data ?? []) as ClassTaskRecord[], error: null };
}

/**
 * Additive import: clone subject tasks whose ids are not already referenced
 * by source_subject_task_id on this class.
 */
export async function importMissingSubjectTasksToClass(
  adminClient: Supabase,
  classId: string,
  subjectId: string
): Promise<{ data: ClassTaskRecord[]; error: string | null; skipped: number }> {
  const [subjectTasks, existingSources] = await Promise.all([
    subjectTaskRepository.listSubjectTasksBySubjectId(adminClient, subjectId),
    classTaskRepository.listSourceSubjectTaskIdsForClass(adminClient, classId),
  ]);

  if (subjectTasks.error) {
    return { data: [], error: subjectTasks.error.message, skipped: 0 };
  }
  if (existingSources.error) {
    return { data: [], error: existingSources.error.message, skipped: 0 };
  }

  const existing = new Set(
    (existingSources.data ?? [])
      .map((row) => row.source_subject_task_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );

  const toClone = (subjectTasks.data ?? []).filter((task) => !existing.has(task.id));
  const skipped = (subjectTasks.data ?? []).length - toClone.length;

  if (toClone.length === 0) {
    return { data: [], error: null, skipped };
  }

  const existingClassTasks = await classTaskRepository.listClassTasksByClassId(
    adminClient,
    classId
  );
  if (existingClassTasks.error) {
    return { data: [], error: existingClassTasks.error.message, skipped };
  }

  const maxSort = (existingClassTasks.data ?? []).reduce(
    (max, row) => Math.max(max, row.sort_order),
    -1
  );

  const rows = toClone.map((task, index) => ({
    class_id: classId,
    source_subject_task_id: task.id,
    title: task.title,
    description: task.description,
    period: task.period,
    max_grade: task.max_grade,
    sort_order: maxSort + 1 + index,
    started: false,
    started_at: null,
    due_date: null,
  }));

  const created = await classTaskRepository.createClassTasks(adminClient, rows);
  if (created.error) {
    return { data: [], error: created.error.message, skipped };
  }

  return {
    data: (created.data ?? []) as ClassTaskRecord[],
    error: null,
    skipped,
  };
}
