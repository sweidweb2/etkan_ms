import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuestStatus } from "@/lib/constants/guest";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const GUEST_STATUS_EVENT_COLUMNS =
  "id, guest_id, status, note, created_by, created_at";

export type GuestStatusEventRecord = {
  id: string;
  guest_id: string;
  status: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type CreateGuestStatusEventInput = {
  guest_id: string;
  status: GuestStatus;
  note: string | null;
  created_by: string | null;
};

export async function createGuestStatusEvent(
  client: Supabase,
  input: CreateGuestStatusEventInput
) {
  return client
    .from("guest_status_events")
    .insert({
      guest_id: input.guest_id,
      status: input.status,
      note: input.note,
      created_by: input.created_by,
    })
    .select(GUEST_STATUS_EVENT_COLUMNS)
    .single();
}

export async function createGuestStatusEvents(
  client: Supabase,
  inputs: CreateGuestStatusEventInput[]
) {
  if (inputs.length === 0) {
    return { data: [] as GuestStatusEventRecord[], error: null };
  }

  return client
    .from("guest_status_events")
    .insert(
      inputs.map((input) => ({
        guest_id: input.guest_id,
        status: input.status,
        note: input.note,
        created_by: input.created_by,
      }))
    )
    .select(GUEST_STATUS_EVENT_COLUMNS);
}

export async function listGuestStatusEventsByGuestId(
  client: Supabase,
  guestId: string
) {
  return client
    .from("guest_status_events")
    .select(GUEST_STATUS_EVENT_COLUMNS)
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false });
}

export async function listGuestStatusValuesByGuestId(
  client: Supabase,
  guestId: string
) {
  return client
    .from("guest_status_events")
    .select("status")
    .eq("guest_id", guestId);
}

export async function guestStatusEventExistsByGuestIdAndStatus(
  client: Supabase,
  guestId: string,
  status: GuestStatus
) {
  return client
    .from("guest_status_events")
    .select("id")
    .eq("guest_id", guestId)
    .eq("status", status)
    .limit(1)
    .maybeSingle();
}

export async function deleteGuestStatusEventsByGuestIdAndStatus(
  client: Supabase,
  guestId: string,
  status: GuestStatus
) {
  return client
    .from("guest_status_events")
    .delete()
    .eq("guest_id", guestId)
    .eq("status", status)
    .select(GUEST_STATUS_EVENT_COLUMNS);
}
