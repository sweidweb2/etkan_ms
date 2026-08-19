import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SLOT_COLUMNS =
  "id, name, type, slot_date, start_time, end_time, color, created_at, updated_at";

export type WeeklyScheduleSlotRecord = {
  id: string;
  name: string;
  type: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  color: string;
  created_at: string;
  updated_at: string;
};

export type CreateWeeklyScheduleSlotRecordInput = {
  name: string;
  type: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  color: string;
};

export type UpdateWeeklyScheduleSlotRecordInput =
  CreateWeeklyScheduleSlotRecordInput;

export async function listWeeklyScheduleSlots(client: Supabase) {
  return client
    .from("weekly_schedule_slots")
    .select(SLOT_COLUMNS)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });
}

export async function listWeeklyScheduleSlotsInDateRange(
  client: Supabase,
  fromDate: string,
  toDate: string
) {
  return client
    .from("weekly_schedule_slots")
    .select(SLOT_COLUMNS)
    .gte("slot_date", fromDate)
    .lte("slot_date", toDate)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });
}

export async function findWeeklyScheduleSlotById(client: Supabase, id: string) {
  return client
    .from("weekly_schedule_slots")
    .select(SLOT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createWeeklyScheduleSlot(
  client: Supabase,
  input: CreateWeeklyScheduleSlotRecordInput
) {
  const now = new Date().toISOString();

  return client
    .from("weekly_schedule_slots")
    .insert({
      name: input.name,
      type: input.type,
      slot_date: input.slot_date,
      start_time: input.start_time,
      end_time: input.end_time,
      color: input.color,
      updated_at: now,
    })
    .select(SLOT_COLUMNS)
    .single();
}

export async function createWeeklyScheduleSlots(
  client: Supabase,
  inputs: CreateWeeklyScheduleSlotRecordInput[]
) {
  if (inputs.length === 0) {
    return { data: [] as WeeklyScheduleSlotRecord[], error: null };
  }

  const now = new Date().toISOString();

  return client
    .from("weekly_schedule_slots")
    .insert(
      inputs.map((input) => ({
        name: input.name,
        type: input.type,
        slot_date: input.slot_date,
        start_time: input.start_time,
        end_time: input.end_time,
        color: input.color,
        updated_at: now,
      }))
    )
    .select(SLOT_COLUMNS);
}

export async function updateWeeklyScheduleSlot(
  client: Supabase,
  id: string,
  input: UpdateWeeklyScheduleSlotRecordInput
) {
  const now = new Date().toISOString();

  return client
    .from("weekly_schedule_slots")
    .update({
      name: input.name,
      type: input.type,
      slot_date: input.slot_date,
      start_time: input.start_time,
      end_time: input.end_time,
      color: input.color,
      updated_at: now,
    })
    .eq("id", id)
    .select(SLOT_COLUMNS)
    .single();
}

export async function deleteWeeklyScheduleSlotById(client: Supabase, id: string) {
  return client.from("weekly_schedule_slots").delete().eq("id", id);
}

export type CopyWeeklyScheduleFromLastWeekResult = {
  created_count: number;
  skipped_count: number;
};

export async function copyWeeklyScheduleFromLastWeek(
  client: Supabase,
  weekStart: string
) {
  return client.rpc("copy_weekly_schedule_from_last_week", {
    p_week_start: weekStart,
  });
}
