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
  grade?: number | null;
  notes?: string | null;
  graded_at?: string | null;
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

export async function listStudentTaskIdsByStudentId(
  client: Supabase,
  studentId: string
) {
  return client.from("student_tasks").select("id").eq("student_id", studentId);
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

const STUDENT_TASK_GRADE_ANALYTICS_COLUMNS = "student_id, task_id, grade, status";
const STUDENT_TASKS_PAGE_SIZE = 1000;
const TASK_ID_QUERY_CHUNK_SIZE = 100;

export async function listStudentTasksByTaskIds(
  client: Supabase,
  taskIds: string[]
) {
  if (taskIds.length === 0) {
    return { data: [], error: null };
  }

  const rows: Array<{
    student_id: string;
    task_id: string;
    grade: number | null;
    status: string;
  }> = [];

  for (let index = 0; index < taskIds.length; index += TASK_ID_QUERY_CHUNK_SIZE) {
    const taskIdChunk = taskIds.slice(index, index + TASK_ID_QUERY_CHUNK_SIZE);
    let offset = 0;

    while (true) {
      const { data, error } = await client
        .from("student_tasks")
        .select(STUDENT_TASK_GRADE_ANALYTICS_COLUMNS)
        .in("task_id", taskIdChunk)
        .range(offset, offset + STUDENT_TASKS_PAGE_SIZE - 1);

      if (error) {
        return { data: null, error };
      }

      const page = data ?? [];
      rows.push(...page);

      if (page.length < STUDENT_TASKS_PAGE_SIZE) {
        break;
      }

      offset += STUDENT_TASKS_PAGE_SIZE;
    }
  }

  return { data: rows, error: null };
}

export async function listStudentTasksForGradesByTaskIds(
  client: Supabase,
  taskIds: string[]
) {
  if (taskIds.length === 0) {
    return { data: [] as StudentTaskRecord[], error: null };
  }

  const rows: StudentTaskRecord[] = [];

  for (let index = 0; index < taskIds.length; index += TASK_ID_QUERY_CHUNK_SIZE) {
    const taskIdChunk = taskIds.slice(index, index + TASK_ID_QUERY_CHUNK_SIZE);
    let offset = 0;

    while (true) {
      const { data, error } = await client
        .from("student_tasks")
        .select(STUDENT_TASK_COLUMNS)
        .in("task_id", taskIdChunk)
        .range(offset, offset + STUDENT_TASKS_PAGE_SIZE - 1);

      if (error) {
        return { data: null, error };
      }

      const page = (data ?? []) as StudentTaskRecord[];
      rows.push(...page);

      if (page.length < STUDENT_TASKS_PAGE_SIZE) {
        break;
      }

      offset += STUDENT_TASKS_PAGE_SIZE;
    }
  }

  return { data: rows, error: null };
}

/** Same as listStudentTasksForGradesByTaskIds but scoped to one student. */
export async function listStudentTasksForGradesByTaskIdsAndStudentId(
  client: Supabase,
  taskIds: string[],
  studentId: string
) {
  if (taskIds.length === 0 || !studentId) {
    return { data: [] as StudentTaskRecord[], error: null };
  }

  const rows: StudentTaskRecord[] = [];

  for (let index = 0; index < taskIds.length; index += TASK_ID_QUERY_CHUNK_SIZE) {
    const taskIdChunk = taskIds.slice(index, index + TASK_ID_QUERY_CHUNK_SIZE);
    let offset = 0;

    while (true) {
      const { data, error } = await client
        .from("student_tasks")
        .select(STUDENT_TASK_COLUMNS)
        .eq("student_id", studentId)
        .in("task_id", taskIdChunk)
        .range(offset, offset + STUDENT_TASKS_PAGE_SIZE - 1);

      if (error) {
        return { data: null, error };
      }

      const page = (data ?? []) as StudentTaskRecord[];
      rows.push(...page);

      if (page.length < STUDENT_TASKS_PAGE_SIZE) {
        break;
      }

      offset += STUDENT_TASKS_PAGE_SIZE;
    }
  }

  return { data: rows, error: null };
}

export async function findStudentTaskById(client: Supabase, id: string) {
  return client
    .from("student_tasks")
    .select(STUDENT_TASK_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function seedLateJoinStudentTasks(
  client: Supabase,
  classId: string,
  studentUserId: string
) {
  return client.rpc("seed_late_join_student_tasks", {
    p_class_id: classId,
    p_student_id: studentUserId,
  });
}

export async function seedLateJoinStudentTasksForStudents(
  client: Supabase,
  classId: string,
  studentUserIds: string[]
) {
  if (studentUserIds.length === 0) {
    return { data: 0, error: null };
  }

  return client.rpc("seed_late_join_student_tasks_for_students", {
    p_class_id: classId,
    p_student_ids: studentUserIds,
  });
}

export async function seedStudentTasksForNewTask(
  client: Supabase,
  taskId: string
) {
  const { data, error } = await client.rpc("seed_student_tasks_for_new_task", {
    p_task_id: taskId,
  });

  if (error) {
    return { data: null, error };
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return { data: rows as StudentTaskRecord[], error: null };
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
        grade: row.grade ?? null,
        notes: row.notes ?? null,
        graded_at: row.graded_at ?? null,
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

/** Clamps grades above maxGrade down to maxGrade for this task. */
export async function clampStudentTaskGradesAboveMax(
  client: Supabase,
  taskId: string,
  maxGrade: number
) {
  return client
    .from("student_tasks")
    .update({ grade: maxGrade })
    .eq("task_id", taskId)
    .gt("grade", maxGrade)
    .select("id");
}

export async function deleteStudentTasksByTaskId(
  client: Supabase,
  taskId: string
) {
  return client.from("student_tasks").delete().eq("task_id", taskId).select("id");
}
