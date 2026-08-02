import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const WORKSHOP_DOCUMENT_COLUMNS =
  "id, workshop_id, name, storage_path, file_size, mime_type, uploaded_by, created_at";

export type WorkshopDocumentRecord = {
  id: string;
  workshop_id: string;
  name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type CreateWorkshopDocumentRecordInput = {
  workshop_id: string;
  name: string;
  storage_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_by?: string | null;
};

export async function listWorkshopDocumentsByWorkshopId(
  client: Supabase,
  workshopId: string
) {
  return client
    .from("workshop_documents")
    .select(WORKSHOP_DOCUMENT_COLUMNS)
    .eq("workshop_id", workshopId)
    .order("created_at", { ascending: false });
}

export async function findWorkshopDocumentById(client: Supabase, id: string) {
  return client
    .from("workshop_documents")
    .select(WORKSHOP_DOCUMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createWorkshopDocument(
  client: Supabase,
  input: CreateWorkshopDocumentRecordInput
) {
  return client
    .from("workshop_documents")
    .insert({
      workshop_id: input.workshop_id,
      name: input.name,
      storage_path: input.storage_path,
      file_size: input.file_size ?? null,
      mime_type: input.mime_type ?? null,
      uploaded_by: input.uploaded_by ?? null,
    })
    .select(WORKSHOP_DOCUMENT_COLUMNS)
    .single();
}

export async function updateWorkshopDocumentNameById(
  client: Supabase,
  id: string,
  name: string
) {
  return client
    .from("workshop_documents")
    .update({ name })
    .eq("id", id)
    .select(WORKSHOP_DOCUMENT_COLUMNS)
    .single();
}

export async function deleteWorkshopDocumentById(client: Supabase, id: string) {
  return client.from("workshop_documents").delete().eq("id", id);
}
