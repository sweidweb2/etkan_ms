import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SLOT_COLUMNS =
  "id, entity_type, record_id, name, type, slot_date, day_of_week, start_time, end_time, color, created_at, updated_at";

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
  color: string;
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
  color: string;
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
      color: input.color,
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
      color: input.color,
      updated_at: now,
    })
    .eq("id", id)
    .select(SLOT_COLUMNS)
    .single();
}

export async function deleteInstructorScheduleSlotById(
  client: Supabase,
  id: string
) {
  return client.from("instructor_schedule_slots").delete().eq("id", id);
}
