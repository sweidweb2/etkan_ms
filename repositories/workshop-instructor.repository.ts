import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const WORKSHOP_INSTRUCTOR_COLUMNS =
  "id, workshop_id, user_id, role, wage_type, wage_amount, notes, created_at";

const WORKSHOP_INSTRUCTOR_WITH_PROFILE_COLUMNS =
  "id, workshop_id, user_id, role, wage_type, wage_amount, notes, created_at, profiles(username)";

export type WorkshopInstructorRecord = {
  id: string;
  workshop_id: string;
  user_id: string;
  role: string;
  wage_type: string;
  wage_amount: number | null;
  notes: string | null;
  created_at: string;
};

export type WorkshopInstructorWithProfileRecord = WorkshopInstructorRecord & {
  profiles: { username: string } | null;
};

export type CreateWorkshopInstructorRecordInput = {
  workshop_id: string;
  user_id: string;
  role: string;
  wage_type: string;
  wage_amount?: number | null;
  notes?: string | null;
};

export type UpdateWorkshopInstructorRecordInput = {
  role: string;
  wage_type: string;
  wage_amount: number | null;
  notes: string | null;
};

export async function listWorkshopInstructorsByWorkshopId(
  client: Supabase,
  workshopId: string
) {
  return client
    .from("workshop_instructors")
    .select(WORKSHOP_INSTRUCTOR_WITH_PROFILE_COLUMNS)
    .eq("workshop_id", workshopId)
    .order("created_at", { ascending: true });
}

export async function findWorkshopInstructorById(
  client: Supabase,
  id: string
) {
  return client
    .from("workshop_instructors")
    .select(WORKSHOP_INSTRUCTOR_WITH_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findWorkshopInstructorByWorkshopAndUser(
  client: Supabase,
  workshopId: string,
  userId: string
) {
  return client
    .from("workshop_instructors")
    .select(WORKSHOP_INSTRUCTOR_COLUMNS)
    .eq("workshop_id", workshopId)
    .eq("user_id", userId)
    .maybeSingle();
}

/** Assignment rows for one instructor (all workshops they teach). */
export async function listWorkshopInstructorsByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("workshop_instructors")
    .select(WORKSHOP_INSTRUCTOR_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function createWorkshopInstructor(
  client: Supabase,
  input: CreateWorkshopInstructorRecordInput
) {
  return client
    .from("workshop_instructors")
    .insert({
      workshop_id: input.workshop_id,
      user_id: input.user_id,
      role: input.role,
      wage_type: input.wage_type,
      wage_amount: input.wage_amount ?? null,
      notes: input.notes ?? null,
    })
    .select(WORKSHOP_INSTRUCTOR_WITH_PROFILE_COLUMNS)
    .single();
}

export async function updateWorkshopInstructorById(
  client: Supabase,
  id: string,
  input: UpdateWorkshopInstructorRecordInput
) {
  return client
    .from("workshop_instructors")
    .update({
      role: input.role,
      wage_type: input.wage_type,
      wage_amount: input.wage_amount,
      notes: input.notes,
    })
    .eq("id", id)
    .select(WORKSHOP_INSTRUCTOR_WITH_PROFILE_COLUMNS)
    .single();
}

export async function deleteWorkshopInstructorById(
  client: Supabase,
  id: string
) {
  return client.from("workshop_instructors").delete().eq("id", id);
}

/**
 * Removes all workshop assignments for a user.
 * Used when `is_instructor` flips off. Profile hard-delete cascades via FK.
 */
export async function deleteWorkshopInstructorsByUserId(
  client: Supabase,
  userId: string
) {
  return client.from("workshop_instructors").delete().eq("user_id", userId);
}
