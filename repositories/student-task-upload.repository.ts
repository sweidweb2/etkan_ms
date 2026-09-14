import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const STUDENT_TASK_UPLOAD_COLUMNS =
  "id, student_task_id, storage_path, file_name, mime_type, file_size, uploaded_by, created_at";

export type StudentTaskUploadRecord = {
  id: string;
  student_task_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
};

export type CreateStudentTaskUploadInput = {
  student_task_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by?: string | null;
};

export async function listStudentTaskUploadsByStudentTaskIds(
  client: Supabase,
  studentTaskIds: string[]
) {
  if (studentTaskIds.length === 0) {
    return { data: [] as StudentTaskUploadRecord[], error: null };
  }

  return client
    .from("student_task_uploads")
    .select(STUDENT_TASK_UPLOAD_COLUMNS)
    .in("student_task_id", studentTaskIds)
    .order("created_at", { ascending: false });
}

export async function countStudentTaskUploadsByStudentTaskId(
  client: Supabase,
  studentTaskId: string
) {
  return client
    .from("student_task_uploads")
    .select("id", { count: "exact", head: true })
    .eq("student_task_id", studentTaskId);
}

export async function findStudentTaskUploadById(client: Supabase, id: string) {
  return client
    .from("student_task_uploads")
    .select(STUDENT_TASK_UPLOAD_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createStudentTaskUpload(
  client: Supabase,
  input: CreateStudentTaskUploadInput
) {
  return client
    .from("student_task_uploads")
    .insert({
      student_task_id: input.student_task_id,
      storage_path: input.storage_path,
      file_name: input.file_name,
      mime_type: input.mime_type,
      file_size: input.file_size,
      uploaded_by: input.uploaded_by ?? null,
    })
    .select(STUDENT_TASK_UPLOAD_COLUMNS)
    .single();
}

export async function deleteStudentTaskUploadById(client: Supabase, id: string) {
  return client.from("student_task_uploads").delete().eq("id", id);
}
