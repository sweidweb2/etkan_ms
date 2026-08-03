import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const WORKSHOP_SESSION_COLUMNS =
  "id, workshop_id, nb_order, session_date, start_time, end_time, nb_hours, topic, notes, suggestions, status, participants_eval, session_eval, created_at, updated_at";

export type WorkshopSessionRecord = {
  id: string;
  workshop_id: string;
  nb_order: number;
  session_date: string;
  start_time: string;
  end_time: string;
  nb_hours: number;
  topic: string;
  notes: string | null;
  suggestions: string | null;
  status: string;
  participants_eval: number | null;
  session_eval: number | null;
  created_at: string;
  updated_at: string;
};

export type CreateWorkshopSessionRecordInput = {
  workshop_id: string;
  nb_order: number;
  session_date: string;
  start_time: string;
  end_time: string;
  nb_hours: number;
  topic: string;
  notes?: string | null;
  suggestions?: string | null;
  status: string;
  participants_eval?: number | null;
  session_eval?: number | null;
};

export type UpdateWorkshopSessionRecordInput = {
  nb_order: number;
  session_date: string;
  start_time: string;
  end_time: string;
  nb_hours: number;
  topic: string;
  notes: string | null;
  suggestions: string | null;
  status: string;
  participants_eval: number | null;
  session_eval: number | null;
};

export async function listWorkshopSessionsByWorkshopId(
  client: Supabase,
  workshopId: string
) {
  return client
    .from("workshop_sessions")
    .select(WORKSHOP_SESSION_COLUMNS)
    .eq("workshop_id", workshopId)
    .order("nb_order", { ascending: true })
    .order("session_date", { ascending: true });
}

export async function findWorkshopSessionById(client: Supabase, id: string) {
  return client
    .from("workshop_sessions")
    .select(WORKSHOP_SESSION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function getMaxWorkshopSessionOrder(
  client: Supabase,
  workshopId: string
) {
  return client
    .from("workshop_sessions")
    .select("nb_order")
    .eq("workshop_id", workshopId)
    .order("nb_order", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function countWorkshopSessionsByWorkshopId(
  client: Supabase,
  workshopId: string
) {
  return client
    .from("workshop_sessions")
    .select("id", { count: "exact", head: true })
    .eq("workshop_id", workshopId);
}

export async function createWorkshopSession(
  client: Supabase,
  input: CreateWorkshopSessionRecordInput
) {
  return client
    .from("workshop_sessions")
    .insert({
      workshop_id: input.workshop_id,
      nb_order: input.nb_order,
      session_date: input.session_date,
      start_time: input.start_time,
      end_time: input.end_time,
      nb_hours: input.nb_hours,
      topic: input.topic,
      notes: input.notes ?? null,
      suggestions: input.suggestions ?? null,
      status: input.status,
      participants_eval: input.participants_eval ?? null,
      session_eval: input.session_eval ?? null,
    })
    .select(WORKSHOP_SESSION_COLUMNS)
    .single();
}

export async function updateWorkshopSessionById(
  client: Supabase,
  id: string,
  input: UpdateWorkshopSessionRecordInput
) {
  return client
    .from("workshop_sessions")
    .update({
      nb_order: input.nb_order,
      session_date: input.session_date,
      start_time: input.start_time,
      end_time: input.end_time,
      nb_hours: input.nb_hours,
      topic: input.topic,
      notes: input.notes,
      suggestions: input.suggestions,
      status: input.status,
      participants_eval: input.participants_eval,
      session_eval: input.session_eval,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(WORKSHOP_SESSION_COLUMNS)
    .single();
}

export async function deleteWorkshopSessionById(client: Supabase, id: string) {
  return client.from("workshop_sessions").delete().eq("id", id);
}
