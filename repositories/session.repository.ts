import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SESSION_COLUMNS =
  "id, class_id, nb_order, topic, starts_at, ends_at, semester_id, group_grade_level, created_at";

export type SessionRecord = {
  id: string;
  class_id: string;
  nb_order: number;
  topic: string;
  starts_at: string;
  ends_at: string;
  semester_id: string | null;
  group_grade_level: string | null;
  created_at: string;
};

export type CreateSessionRecordInput = {
  class_id: string;
  nb_order: number;
  topic: string;
  starts_at: string;
  ends_at: string;
  semester_id?: string | null;
  group_grade_level?: string | null;
};

export type UpdateSessionSettingsInput = {
  semester_id?: string | null;
  group_grade_level?: string | null;
};

export type UpdateSessionDetailsInput = {
  topic: string;
  starts_at: string;
  ends_at: string;
};

export async function listSessionCountsByClassIds(
  client: Supabase,
  classIds: string[]
) {
  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  return client.from("sessions").select("class_id").in("class_id", classIds);
}

export async function listSessionsByClassId(client: Supabase, classId: string) {
  return client
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("class_id", classId)
    .order("nb_order", { ascending: true });
}

export async function findSessionById(client: Supabase, id: string) {
  return client
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function getMaxSessionNbOrderByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("sessions")
    .select("nb_order")
    .eq("class_id", classId)
    .order("nb_order", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function createSession(
  client: Supabase,
  input: CreateSessionRecordInput
) {
  return client
    .from("sessions")
    .insert({
      class_id: input.class_id,
      nb_order: input.nb_order,
      topic: input.topic,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      semester_id: input.semester_id ?? null,
      group_grade_level: input.group_grade_level ?? null,
    })
    .select(SESSION_COLUMNS)
    .single();
}

export async function updateSessionDetails(
  client: Supabase,
  id: string,
  input: UpdateSessionDetailsInput
) {
  return client
    .from("sessions")
    .update({
      topic: input.topic,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
    })
    .eq("id", id)
    .select(SESSION_COLUMNS)
    .single();
}

export async function updateSessionSettings(
  client: Supabase,
  id: string,
  input: UpdateSessionSettingsInput
) {
  const patch: {
    semester_id?: string | null;
    group_grade_level?: string | null;
  } = {};

  if ("semester_id" in input) {
    patch.semester_id = input.semester_id ?? null;
  }

  if ("group_grade_level" in input) {
    patch.group_grade_level = input.group_grade_level ?? null;
  }

  return client
    .from("sessions")
    .update(patch)
    .eq("id", id)
    .select(SESSION_COLUMNS)
    .single();
}

export async function listSessionIdsByClassId(client: Supabase, classId: string) {
  return client.from("sessions").select("id, nb_order, topic").eq("class_id", classId);
}

export async function updateSessionNbOrder(
  client: Supabase,
  id: string,
  nb_order: number
) {
  return client
    .from("sessions")
    .update({ nb_order })
    .eq("id", id)
    .select(SESSION_COLUMNS)
    .single();
}

export async function deleteSessionById(client: Supabase, id: string) {
  return client.from("sessions").delete().eq("id", id);
}
