import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const WORKSHOP_COLUMNS =
  "id, name, subject, status, target_audience, nb_participants, proposal_notes, number_of_sessions, price, start_date, end_date, delivery_place, created_by, created_at, updated_at";

export type WorkshopRecord = {
  id: string;
  name: string;
  subject: string | null;
  status: string;
  target_audience: string | null;
  nb_participants: number | null;
  proposal_notes: string | null;
  number_of_sessions: number | null;
  price: number | null;
  start_date: string | null;
  end_date: string | null;
  delivery_place: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateWorkshopRecordInput = {
  name: string;
  subject?: string | null;
  status: string;
  target_audience?: string | null;
  nb_participants?: number | null;
  proposal_notes?: string | null;
  number_of_sessions?: number | null;
  price?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  delivery_place?: string | null;
  created_by?: string | null;
};

export type UpdateWorkshopRecordInput = {
  name: string;
  subject: string | null;
  target_audience: string | null;
  nb_participants: number | null;
  proposal_notes: string | null;
  number_of_sessions: number | null;
  price: number | null;
  start_date: string | null;
  end_date: string | null;
  delivery_place: string | null;
};

export async function listWorkshops(client: Supabase) {
  return client
    .from("workshops")
    .select(WORKSHOP_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function findWorkshopById(client: Supabase, id: string) {
  return client
    .from("workshops")
    .select(WORKSHOP_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createWorkshop(
  client: Supabase,
  input: CreateWorkshopRecordInput
) {
  return client
    .from("workshops")
    .insert({
      name: input.name,
      subject: input.subject ?? null,
      status: input.status,
      target_audience: input.target_audience ?? null,
      nb_participants: input.nb_participants ?? null,
      proposal_notes: input.proposal_notes ?? null,
      number_of_sessions: input.number_of_sessions ?? null,
      price: input.price ?? null,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      delivery_place: input.delivery_place ?? null,
      created_by: input.created_by ?? null,
    })
    .select(WORKSHOP_COLUMNS)
    .single();
}

export async function updateWorkshopById(
  client: Supabase,
  id: string,
  input: UpdateWorkshopRecordInput
) {
  return client
    .from("workshops")
    .update({
      name: input.name,
      subject: input.subject,
      target_audience: input.target_audience,
      nb_participants: input.nb_participants,
      proposal_notes: input.proposal_notes,
      number_of_sessions: input.number_of_sessions,
      price: input.price,
      start_date: input.start_date,
      end_date: input.end_date,
      delivery_place: input.delivery_place,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(WORKSHOP_COLUMNS)
    .single();
}

export async function deleteWorkshopById(client: Supabase, id: string) {
  return client.from("workshops").delete().eq("id", id);
}

export async function countWorkshopPaymentsByWorkshopId(
  client: Supabase,
  workshopId: string
) {
  return client
    .from("workshop_payments")
    .select("id", { count: "exact", head: true })
    .eq("workshop_id", workshopId);
}

export async function listWorkshopDocumentStoragePaths(
  client: Supabase,
  workshopId: string
) {
  return client
    .from("workshop_documents")
    .select("storage_path")
    .eq("workshop_id", workshopId);
}
