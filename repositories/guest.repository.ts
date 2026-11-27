import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GuestCurrentStatus,
  GuestEducationLevel,
  GuestInterestedService,
  GuestReferredFrom,
} from "@/lib/constants/guest";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const GUEST_COLUMNS =
  "id, full_name, phone, age, school_or_university, education_level, interested_service, referred_from, referred_from_other, status, notes, created_by, created_at, updated_at";

export type GuestRecord = {
  id: string;
  full_name: string;
  phone: string | null;
  age: number | null;
  school_or_university: string | null;
  education_level: string | null;
  interested_service: string | null;
  referred_from: string | null;
  referred_from_other: string | null;
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
  referred_from: GuestReferredFrom | null;
  referred_from_other: string | null;
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
  referred_from: GuestReferredFrom | null;
  referred_from_other: string | null;
  notes: string | null;
};

export async function listGuests(client: Supabase) {
  return client
    .from("guests")
    .select(GUEST_COLUMNS)
    .order("created_at", { ascending: false });
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Strips characters that would break PostgREST `or()` filters / ilike wildcards. */
function sanitizeSearchTerm(search: string) {
  return search.replace(/[%_*,()\\]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * One page of guests (newest first) plus the exact filtered count.
 * Search matches `full_name` / `phone` (and `id` when the term is a UUID).
 */
export async function listGuestsPage(
  client: Supabase,
  options: {
    offset: number;
    limit: number;
    search?: string | null;
    status?: string | null;
    interestedService?: string | null;
    excludeIds?: string[];
    excludeStatuses?: string[];
  }
) {
  let query = client
    .from("guests")
    .select(GUEST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (options.status) {
    query = query.eq("status", options.status);
  } else if (options.excludeStatuses?.length) {
    query = query.not(
      "status",
      "in",
      `(${options.excludeStatuses.join(",")})`
    );
  }

  if (options.interestedService) {
    query = query.eq("interested_service", options.interestedService);
  }

  if (options.excludeIds?.length) {
    query = query.not("id", "in", `(${options.excludeIds.join(",")})`);
  }

  const search = options.search ? sanitizeSearchTerm(options.search) : "";
  if (search) {
    const filters = [
      `full_name.ilike.%${search}%`,
      `phone.ilike.%${search}%`,
    ];
    if (UUID_PATTERN.test(search)) {
      filters.push(`id.eq.${search}`);
    }
    query = query.or(filters.join(","));
  }

  return query.range(options.offset, options.offset + options.limit - 1);
}

export async function listGuestsByIds(client: Supabase, ids: string[]) {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  return client.from("guests").select(GUEST_COLUMNS).in("id", ids);
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
      referred_from: input.referred_from,
      referred_from_other: input.referred_from_other,
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
      referred_from: input.referred_from,
      referred_from_other: input.referred_from_other,
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
