import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SLOT_COLUMNS =
  "id, entity_type, record_id, name, type, slot_date, day_of_week, start_time, end_time, source_workshop_id, source_slot_id, created_at, updated_at";

export type InstructorScheduleSlotRecord = {
  id: string;
  entity_type: string;
  record_id: string;
  name: string;
  type: string;
  slot_date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  source_workshop_id: string | null;
  source_slot_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateInstructorScheduleSlotRecordInput = {
  entity_type: string;
  record_id: string;
  name: string;
  type: string;
  slot_date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  source_workshop_id?: string | null;
  source_slot_id?: string | null;
};

export type UpdateInstructorScheduleSlotRecordInput =
  CreateInstructorScheduleSlotRecordInput;

export async function listInstructorScheduleSlotsByEntity(
  client: Supabase,
  entityType: string
) {
  return client
    .from("instructor_schedule_slots")
    .select(SLOT_COLUMNS)
    .eq("entity_type", entityType)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
}

export async function listAllInstructorScheduleSlots(client: Supabase) {
  return client
    .from("instructor_schedule_slots")
    .select(SLOT_COLUMNS)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
}

export type ListInstructorScheduleSlotsPageInput = {
  offset: number;
  limit: number;
  entityType?: string;
  type?: string;
  search?: string;
  /** Workshop record IDs whose slots should be excluded (content-locked). */
  excludeWorkshopRecordIds?: string[];
};

export async function listInstructorScheduleSlotsPage(
  client: Supabase,
  input: ListInstructorScheduleSlotsPageInput
) {
  let query = client
    .from("instructor_schedule_slots")
    .select(SLOT_COLUMNS, { count: "exact" })
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true })
    .range(input.offset, input.offset + input.limit - 1);

  if (input.type) {
    query = query.eq("type", input.type);
  }

  const search = input.search?.trim();
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const excludeIds = input.excludeWorkshopRecordIds ?? [];

  if (input.entityType === "instructor") {
    query = query.eq("entity_type", "instructor");
  } else if (input.entityType === "workshop") {
    query = query.eq("entity_type", "workshop");
    if (excludeIds.length > 0) {
      query = query.not("record_id", "in", `(${excludeIds.join(",")})`);
    }
  } else if (excludeIds.length > 0) {
    query = query.or(
      `entity_type.eq.instructor,and(entity_type.eq.workshop,record_id.not.in.(${excludeIds.join(",")}))`
    );
  }

  return query;
}

export async function countInstructorScheduleSlotStats(
  client: Supabase,
  excludeWorkshopRecordIds: string[] = []
) {
  const withFilters = (filters: {
    type?: string;
    entityType?: string;
  } = {}) => {
    let query = client
      .from("instructor_schedule_slots")
      .select("id", { count: "exact", head: true });

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.entityType === "instructor") {
      query = query.eq("entity_type", "instructor");
    } else if (filters.entityType === "workshop") {
      query = query.eq("entity_type", "workshop");
      if (excludeWorkshopRecordIds.length > 0) {
        query = query.not(
          "record_id",
          "in",
          `(${excludeWorkshopRecordIds.join(",")})`
        );
      }
    } else if (excludeWorkshopRecordIds.length > 0) {
      query = query.or(
        `entity_type.eq.instructor,and(entity_type.eq.workshop,record_id.not.in.(${excludeWorkshopRecordIds.join(",")}))`
      );
    }

    return query;
  };

  const [totalResult, freeResult, busyResult, instructorResult, workshopResult] =
    await Promise.all([
      withFilters(),
      withFilters({ type: "free" }),
      withFilters({ type: "busy" }),
      withFilters({ entityType: "instructor" }),
      withFilters({ entityType: "workshop" }),
    ]);

  if (totalResult.error) {
    return { data: null, error: totalResult.error };
  }
  if (freeResult.error) {
    return { data: null, error: freeResult.error };
  }
  if (busyResult.error) {
    return { data: null, error: busyResult.error };
  }
  if (instructorResult.error) {
    return { data: null, error: instructorResult.error };
  }
  if (workshopResult.error) {
    return { data: null, error: workshopResult.error };
  }

  return {
    data: {
      total: totalResult.count ?? 0,
      free: freeResult.count ?? 0,
      busy: busyResult.count ?? 0,
      instructorSlots: instructorResult.count ?? 0,
      workshopSlots: workshopResult.count ?? 0,
    },
    error: null,
  };
}

export async function listInstructorScheduleSlotsByRecord(
  client: Supabase,
  entityType: string,
  recordId: string
) {
  return client
    .from("instructor_schedule_slots")
    .select(SLOT_COLUMNS)
    .eq("entity_type", entityType)
    .eq("record_id", recordId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
}

export async function findInstructorScheduleSlotById(
  client: Supabase,
  id: string
) {
  return client
    .from("instructor_schedule_slots")
    .select(SLOT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function listInstructorScheduleSlotsBySourceSlotId(
  client: Supabase,
  sourceSlotId: string
) {
  return client
    .from("instructor_schedule_slots")
    .select(SLOT_COLUMNS)
    .eq("source_slot_id", sourceSlotId);
}

export async function createInstructorScheduleSlot(
  client: Supabase,
  input: CreateInstructorScheduleSlotRecordInput
) {
  const now = new Date().toISOString();

  return client
    .from("instructor_schedule_slots")
    .insert({
      entity_type: input.entity_type,
      record_id: input.record_id,
      name: input.name,
      type: input.type,
      slot_date: input.slot_date,
      day_of_week: input.day_of_week,
      start_time: input.start_time,
      end_time: input.end_time,
      source_workshop_id: input.source_workshop_id ?? null,
      source_slot_id: input.source_slot_id ?? null,
      updated_at: now,
    })
    .select(SLOT_COLUMNS)
    .single();
}

export async function updateInstructorScheduleSlot(
  client: Supabase,
  id: string,
  input: UpdateInstructorScheduleSlotRecordInput
) {
  const now = new Date().toISOString();

  return client
    .from("instructor_schedule_slots")
    .update({
      entity_type: input.entity_type,
      record_id: input.record_id,
      name: input.name,
      type: input.type,
      slot_date: input.slot_date,
      day_of_week: input.day_of_week,
      start_time: input.start_time,
      end_time: input.end_time,
      source_workshop_id: input.source_workshop_id ?? null,
      source_slot_id: input.source_slot_id ?? null,
      updated_at: now,
    })
    .eq("id", id)
    .select(SLOT_COLUMNS)
    .single();
}

export async function updateInstructorScheduleSlotsBySourceSlotId(
  client: Supabase,
  sourceSlotId: string,
  patch: {
    name: string;
    type: string;
    slot_date: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }
) {
  const now = new Date().toISOString();

  return client
    .from("instructor_schedule_slots")
    .update({
      name: patch.name,
      type: patch.type,
      slot_date: patch.slot_date,
      day_of_week: patch.day_of_week,
      start_time: patch.start_time,
      end_time: patch.end_time,
      updated_at: now,
    })
    .eq("source_slot_id", sourceSlotId)
    .select(SLOT_COLUMNS);
}

export async function deleteInstructorScheduleSlotById(
  client: Supabase,
  id: string
) {
  return client.from("instructor_schedule_slots").delete().eq("id", id);
}

export async function deleteInstructorScheduleSlotsBySourceSlotId(
  client: Supabase,
  sourceSlotId: string
) {
  return client
    .from("instructor_schedule_slots")
    .delete()
    .eq("source_slot_id", sourceSlotId);
}

export async function deleteInstructorScheduleSlotsBySourceWorkshopId(
  client: Supabase,
  workshopId: string
) {
  return client
    .from("instructor_schedule_slots")
    .delete()
    .eq("source_workshop_id", workshopId);
}

export async function deleteInstructorScheduleSlotsBySourceWorkshopAndUser(
  client: Supabase,
  workshopId: string,
  userId: string
) {
  return client
    .from("instructor_schedule_slots")
    .delete()
    .eq("source_workshop_id", workshopId)
    .eq("entity_type", "instructor")
    .eq("record_id", userId);
}

export async function deleteInstructorScheduleSlotsByEntityRecord(
  client: Supabase,
  entityType: string,
  recordId: string
) {
  return client
    .from("instructor_schedule_slots")
    .delete()
    .eq("entity_type", entityType)
    .eq("record_id", recordId);
}

export async function createInstructorScheduleSlots(
  client: Supabase,
  inputs: CreateInstructorScheduleSlotRecordInput[]
) {
  if (inputs.length === 0) {
    return {
      data: [] as InstructorScheduleSlotRecord[],
      error: null,
      count: 0,
      status: 200,
      statusText: "OK",
    };
  }

  const now = new Date().toISOString();
  const rows = inputs.map((input) => ({
    entity_type: input.entity_type,
    record_id: input.record_id,
    name: input.name,
    type: input.type,
    slot_date: input.slot_date,
    day_of_week: input.day_of_week,
    start_time: input.start_time,
    end_time: input.end_time,
    source_workshop_id: input.source_workshop_id ?? null,
    source_slot_id: input.source_slot_id ?? null,
    updated_at: now,
  }));

  return client
    .from("instructor_schedule_slots")
    .insert(rows)
    .select(SLOT_COLUMNS);
}
