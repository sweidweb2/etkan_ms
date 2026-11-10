import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SUBJECT_COLUMNS =
  "id, name, syllabus_link, reference_link, handout_link, nb_sessions, stage_id, sort_order, created_at";

export type SubjectRecord = {
  id: string;
  name: string;
  syllabus_link: string | null;
  reference_link: string | null;
  handout_link: string | null;
  nb_sessions: number;
  stage_id: string | null;
  sort_order: number;
  created_at: string | null;
};

export type CreateSubjectRecordInput = {
  name: string;
  syllabus_link?: string | null;
  reference_link?: string | null;
  handout_link?: string | null;
  nb_sessions?: number;
  stage_id?: string | null;
  sort_order?: number;
};

export type UpdateSubjectRecordInput = {
  name: string;
  syllabus_link: string | null;
  reference_link: string | null;
  handout_link: string | null;
  nb_sessions: number;
};

export async function listSubjects(client: Supabase) {
  return client
    .from("subjects")
    .select(SUBJECT_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
}

export async function listSubjectIds(client: Supabase) {
  return client.from("subjects").select("id");
}

const SUBJECT_CAPABILITY_COLUMNS = "id, name, sort_order, created_at";

/** Columns for the instructor capability matrix. Ordered by name. */
export async function listSubjectsForCapabilityMatrix(client: Supabase) {
  return client
    .from("subjects")
    .select(SUBJECT_CAPABILITY_COLUMNS)
    .order("name", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function findSubjectForCapabilityMatrix(
  client: Supabase,
  id: string
) {
  return client
    .from("subjects")
    .select(SUBJECT_CAPABILITY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findSubjectById(client: Supabase, id: string) {
  return client
    .from("subjects")
    .select(SUBJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findSubjectByName(client: Supabase, name: string) {
  return client
    .from("subjects")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();
}

export async function createSubject(
  client: Supabase,
  input: CreateSubjectRecordInput
) {
  return client
    .from("subjects")
    .insert({
      name: input.name,
      syllabus_link: input.syllabus_link ?? null,
      reference_link: input.reference_link ?? null,
      handout_link: input.handout_link ?? null,
      nb_sessions: input.nb_sessions ?? 0,
      stage_id: input.stage_id ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select(SUBJECT_COLUMNS)
    .single();
}

export async function updateSubjectStageById(
  client: Supabase,
  id: string,
  stageId: string | null,
  sortOrder?: number
) {
  return client
    .from("subjects")
    .update({
      stage_id: stageId,
      ...(typeof sortOrder === "number" ? { sort_order: sortOrder } : {}),
    })
    .eq("id", id)
    .select(SUBJECT_COLUMNS)
    .single();
}

export async function updateSubjectsStageByIds(
  client: Supabase,
  ids: string[],
  stageId: string | null
) {
  return client
    .from("subjects")
    .update({ stage_id: stageId })
    .in("id", ids)
    .select(SUBJECT_COLUMNS);
}

export async function updateSubjectBoardPositions(
  client: Supabase,
  placements: Array<{
    id: string;
    stage_id: string | null;
    sort_order: number;
  }>
) {
  const results = await Promise.all(
    placements.map((placement) =>
      client
        .from("subjects")
        .update({
          stage_id: placement.stage_id,
          sort_order: placement.sort_order,
        })
        .eq("id", placement.id)
    )
  );

  const firstError = results.find((result) => result.error)?.error ?? null;
  return { error: firstError };
}

export async function getNextSubjectSortOrderForStage(
  client: Supabase,
  stageId: string | null
) {
  let query = client
    .from("subjects")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  query =
    stageId === null
      ? query.is("stage_id", null)
      : query.eq("stage_id", stageId);

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { data: null as number | null, error };
  }

  return {
    data: (data?.sort_order ?? -1) + 1,
    error: null,
  };
}

export async function updateSubjectById(
  client: Supabase,
  id: string,
  input: UpdateSubjectRecordInput
) {
  return client
    .from("subjects")
    .update({
      name: input.name,
      syllabus_link: input.syllabus_link,
      reference_link: input.reference_link,
      handout_link: input.handout_link,
      nb_sessions: input.nb_sessions,
    })
    .eq("id", id)
    .select(SUBJECT_COLUMNS)
    .single();
}

export async function deleteSubjectById(client: Supabase, id: string) {
  return client.from("subjects").delete().eq("id", id);
}
