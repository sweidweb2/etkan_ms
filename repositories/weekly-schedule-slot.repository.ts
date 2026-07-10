import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SLOT_COLUMNS =
  "id, class_id, day_of_week, start_time, end_time, room, created_at, updated_at";

const SLOT_WITH_CLASS_SELECT = `
  id,
  class_id,
  day_of_week,
  start_time,
  end_time,
  room,
  created_at,
  updated_at,
  classes (
    name,
    subjects ( name ),
    class_teacher (
      profiles:teacher_id ( username )
    )
  )
`;

export type WeeklyScheduleSlotRecord = {
  id: string;
  class_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
  created_at: string;
  updated_at: string;
};

export type WeeklyScheduleSlotWithClassRecord = WeeklyScheduleSlotRecord & {
  classes: {
    name: string;
    subjects: { name: string } | null;
    class_teacher: Array<{
      profiles: { username: string | null } | null;
    }> | null;
  } | null;
};

export type CreateWeeklyScheduleSlotRecordInput = {
  class_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
};

export type UpdateWeeklyScheduleSlotRecordInput =
  CreateWeeklyScheduleSlotRecordInput;

export async function listWeeklyScheduleSlots(client: Supabase) {
  return client
    .from("weekly_schedule_slots")
    .select(SLOT_WITH_CLASS_SELECT)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
}

export async function findWeeklyScheduleSlotById(client: Supabase, id: string) {
  return client
    .from("weekly_schedule_slots")
    .select(SLOT_WITH_CLASS_SELECT)
    .eq("id", id)
    .maybeSingle();
}

export async function listWeeklyScheduleSlotsByRoomAndDay(
  client: Supabase,
  room: string,
  dayOfWeek: string,
  excludeId?: string
) {
  let query = client
    .from("weekly_schedule_slots")
    .select(SLOT_COLUMNS)
    .eq("room", room)
    .eq("day_of_week", dayOfWeek);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  return query;
}

export async function createWeeklyScheduleSlot(
  client: Supabase,
  input: CreateWeeklyScheduleSlotRecordInput
) {
  const now = new Date().toISOString();

  return client
    .from("weekly_schedule_slots")
    .insert({
      class_id: input.class_id,
      day_of_week: input.day_of_week,
      start_time: input.start_time,
      end_time: input.end_time,
      room: input.room,
      updated_at: now,
    })
    .select(SLOT_WITH_CLASS_SELECT)
    .single();
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
      class_id: input.class_id,
      day_of_week: input.day_of_week,
      start_time: input.start_time,
      end_time: input.end_time,
      room: input.room,
      updated_at: now,
    })
    .eq("id", id)
    .select(SLOT_WITH_CLASS_SELECT)
    .single();
}

export async function deleteWeeklyScheduleSlotById(client: Supabase, id: string) {
  return client.from("weekly_schedule_slots").delete().eq("id", id);
}
