import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const DOCUMENT_COLUMNS =
  "id, application_id, storage_path, file_name, mime_type, file_size, sort_order, created_at";

export type StudentRegistrationDocumentRecord = {
  id: string;
  application_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  sort_order: number;
  created_at: string;
};

export type CreateStudentRegistrationDocumentInput = {
  application_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  sort_order: number;
};

export async function createStudentRegistrationDocuments(
  client: Supabase,
  rows: CreateStudentRegistrationDocumentInput[]
) {
  if (rows.length === 0) {
    return { data: [] as StudentRegistrationDocumentRecord[], error: null };
  }

  return client
    .from("student_registration_documents")
    .insert(rows)
    .select(DOCUMENT_COLUMNS);
}

export async function listStudentRegistrationDocumentsByApplicationIds(
  client: Supabase,
  applicationIds: string[]
) {
  if (applicationIds.length === 0) {
    return { data: [] as StudentRegistrationDocumentRecord[], error: null };
  }

  return client
    .from("student_registration_documents")
    .select(DOCUMENT_COLUMNS)
    .in("application_id", applicationIds)
    .order("sort_order", { ascending: true });
}

export async function listStudentRegistrationDocumentsByApplicationId(
  client: Supabase,
  applicationId: string
) {
  return client
    .from("student_registration_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("application_id", applicationId)
    .order("sort_order", { ascending: true });
}
