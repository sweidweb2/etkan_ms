import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const WORKSHOP_COLUMNS =
  "id, name, subject, status, type, phone, target_audience, nb_participants, proposal_notes, number_of_sessions, price, start_date, end_date, delivery_place, created_by, created_at, updated_at";

/** List rows omit `proposal_notes` (detail and edit load the full row). */
const WORKSHOP_LIST_COLUMNS =
  "id, name, subject, status, type, phone, target_audience, nb_participants, number_of_sessions, price, start_date, end_date, delivery_place, created_by, created_at, updated_at";

export type WorkshopRecord = {
  id: string;
  name: string;
  subject: string | null;
  status: string;
  type: string;
  phone: string | null;
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
  type: string;
  phone?: string | null;
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

export type WorkshopListRecord = Omit<WorkshopRecord, "proposal_notes">;

export type ListWorkshopsPageInput = {
  offset: number;
  limit: number;
  type?: string;
  status?: string;
  excludeStatuses?: string[];
  search?: string;
  /** When set, only these workshop ids are eligible. */
  ids?: string[];
};

type WorkshopListFilterable = {
  eq: (column: string, value: string) => WorkshopListFilterable;
  neq: (column: string, value: string) => WorkshopListFilterable;
  in: (column: string, values: string[]) => WorkshopListFilterable;
  or: (filters: string) => WorkshopListFilterable;
};

function applyWorkshopListFilters<T extends WorkshopListFilterable>(
  query: T,
  input: Omit<ListWorkshopsPageInput, "offset" | "limit">
): T {
  let next: WorkshopListFilterable = query;

  if (input.ids) {
    next = next.in("id", input.ids);
  }
  if (input.type) {
    next = next.eq("type", input.type);
  }
  if (input.status) {
    next = next.eq("status", input.status);
  }
  for (const status of input.excludeStatuses ?? []) {
    next = next.neq("status", status);
  }

  const search = input.search?.trim().replace(/[%_,]/g, "");
  if (search) {
    next = next.or(
      [
        `name.ilike.%${search}%`,
        `subject.ilike.%${search}%`,
        `delivery_place.ilike.%${search}%`,
        `target_audience.ilike.%${search}%`,
        `phone.ilike.%${search}%`,
        `type.ilike.%${search}%`,
      ].join(",")
    );
  }

  return next as T;
}

export type UpdateWorkshopRecordInput = {
  name: string;
  subject: string | null;
  type: string;
  phone: string | null;
  target_audience: string | null;
  nb_participants: number | null;
  proposal_notes: string | null;
  price: number | null;
  start_date: string | null;
  end_date: string | null;
  delivery_place: string | null;
};

export async function listWorkshopsPage(
  client: Supabase,
  input: ListWorkshopsPageInput
) {
  if (input.ids && input.ids.length === 0) {
    return { data: [] as WorkshopListRecord[], error: null, count: 0 };
  }

  let query = client
    .from("workshops")
    .select(WORKSHOP_LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  query = applyWorkshopListFilters(query, input);

  return query.range(input.offset, input.offset + input.limit - 1);
}

export async function countWorkshopsByTypes(
  client: Supabase,
  types: readonly string[],
  options: { ids?: string[] } = {}
) {
  if (options.ids && options.ids.length === 0) {
    return {
      data: Object.fromEntries(types.map((type) => [type, 0])),
      error: null,
    };
  }

  const results = await Promise.all(
    types.map((type) => {
      let query = client
        .from("workshops")
        .select("id", { count: "exact", head: true })
        .eq("type", type);

      if (options.ids) {
        query = query.in("id", options.ids);
      }

      return query;
    })
  );

  const counts: Record<string, number> = {};
  for (let index = 0; index < types.length; index += 1) {
    const result = results[index];
    if (!result || result.error) {
      return {
        data: null,
        error: result?.error ?? { message: "Unable to count workshops." },
      };
    }
    counts[types[index]!] = result.count ?? 0;
  }

  return { data: counts, error: null };
}

/** Slim columns for instructor-schedule calendar tabs / bounds. */
const WORKSHOP_SCHEDULE_TAB_COLUMNS =
  "id, name, status, start_date, end_date";

export type WorkshopScheduleTabRecord = {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

export async function listWorkshopsForScheduleTabs(client: Supabase) {
  return client
    .from("workshops")
    .select(WORKSHOP_SCHEDULE_TAB_COLUMNS)
    .order("created_at", { ascending: false });
}

/** id + status only — resolve content-locked workshops without full rows. */
export async function listWorkshopLockStatuses(client: Supabase) {
  return client.from("workshops").select("id, status");
}

export async function listWorkshopsByIds(client: Supabase, ids: string[]) {
  if (ids.length === 0) {
    return { data: [] as WorkshopRecord[], error: null };
  }

  return client
    .from("workshops")
    .select(WORKSHOP_COLUMNS)
    .in("id", ids)
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
      type: input.type,
      phone: input.phone ?? null,
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
      type: input.type,
      phone: input.phone,
      target_audience: input.target_audience,
      nb_participants: input.nb_participants,
      proposal_notes: input.proposal_notes,
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

export async function updateWorkshopNumberOfSessionsById(
  client: Supabase,
  id: string,
  numberOfSessions: number
) {
  return client
    .from("workshops")
    .update({
      number_of_sessions: numberOfSessions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(WORKSHOP_COLUMNS)
    .single();
}

export async function updateWorkshopStatusById(
  client: Supabase,
  id: string,
  status: string,
  options?: { end_date?: string | null }
) {
  return client
    .from("workshops")
    .update({
      status,
      ...(options && "end_date" in options
        ? { end_date: options.end_date ?? null }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(WORKSHOP_COLUMNS)
    .single();
}

export async function updateWorkshopProposalNotesById(
  client: Supabase,
  id: string,
  proposalNotes: string | null
) {
  return client
    .from("workshops")
    .update({
      proposal_notes: proposalNotes,
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
