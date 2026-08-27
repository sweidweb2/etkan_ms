import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GuestCurrentStatus,
  GuestEducationLevel,
  GuestInterestedService,
} from "@/lib/constants/guest";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const GUEST_COLUMNS =
  "id, full_name, phone, age, school_or_university, education_level, interested_service, status, notes, created_by, created_at, updated_at";

export type GuestRecord = {
  id: string;
  full_name: string;
  phone: string | null;
  age: number | null;
  school_or_university: string | null;
  education_level: string | null;
  interested_service: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateGuestRecordInput = {
  full_name: string;
  phone: string | null;
  age: number | null;
  school_or_university: string | null;
  education_level: GuestEducationLevel | null;
  interested_service: GuestInterestedService | null;
  status: GuestCurrentStatus;
  notes: string | null;
  created_by: string | null;
};

export type UpdateGuestRecordInput = {
  full_name: string;
  phone: string | null;
  age: number | null;
  school_or_university: string | null;
  education_level: GuestEducationLevel | null;
  interested_service: GuestInterestedService | null;
  notes: string | null;
};

export async function listGuests(client: Supabase) {
  return client
    .from("guests")
    .select(GUEST_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function findGuestById(client: Supabase, id: string) {
  return client
    .from("guests")
    .select(GUEST_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createGuest(
  client: Supabase,
  input: CreateGuestRecordInput
) {
  return client
    .from("guests")
    .insert({
      full_name: input.full_name,
      phone: input.phone,
      age: input.age,
      school_or_university: input.school_or_university,
      education_level: input.education_level,
      interested_service: input.interested_service,
      status: input.status,
      notes: input.notes,
      created_by: input.created_by,
    })
    .select(GUEST_COLUMNS)
    .single();
}

export async function updateGuest(
  client: Supabase,
  id: string,
  input: UpdateGuestRecordInput
) {
  return client
    .from("guests")
    .update({
      full_name: input.full_name,
      phone: input.phone,
      age: input.age,
      school_or_university: input.school_or_university,
      education_level: input.education_level,
      interested_service: input.interested_service,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(GUEST_COLUMNS)
    .single();
}

export async function deleteGuestById(client: Supabase, id: string) {
  return client.from("guests").delete().eq("id", id);
}

export async function updateGuestStatus(
  client: Supabase,
  id: string,
  status: GuestCurrentStatus
) {
  return client
    .from("guests")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(GUEST_COLUMNS)
    .single();
}
