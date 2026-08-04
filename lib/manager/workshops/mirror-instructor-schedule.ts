import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
} from "@/lib/validators/manager/instructor-schedule-slot";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import type {
  CreateInstructorScheduleSlotRecordInput,
  InstructorScheduleSlotRecord,
} from "@/repositories/instructor-schedule-slot.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type MirrorSyncResult = {
  error: string | null;
  count?: number;
};

function toBusyMirrorInput(
  workshopSlot: InstructorScheduleSlotRecord,
  userId: string
): CreateInstructorScheduleSlotRecordInput {
  return {
    entity_type: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
    record_id: userId,
    name: workshopSlot.name,
    type: "busy",
    slot_date: workshopSlot.slot_date,
    day_of_week: workshopSlot.day_of_week,
    start_time: workshopSlot.start_time,
    end_time: workshopSlot.end_time,
    color: workshopSlot.color,
    source_workshop_id: workshopSlot.record_id,
    source_slot_id: workshopSlot.id,
  };
}

/** Copy all workshop entity slots onto one instructor as busy mirrors. */
export async function mirrorWorkshopSlotsToInstructor(
  admin: Supabase,
  workshopId: string,
  userId: string
): Promise<MirrorSyncResult> {
  const workshopSlotsResult =
    await instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord(
      admin,
      ENTITY_SCHEDULE_TYPE_WORKSHOP,
      workshopId
    );

  if (workshopSlotsResult.error) {
    return {
      error:
        workshopSlotsResult.error.message ||
        "Unable to sync instructor schedule from workshop slots.",
    };
  }

  const workshopSlots = (workshopSlotsResult.data ??
    []) as InstructorScheduleSlotRecord[];

  if (workshopSlots.length === 0) {
    return { error: null, count: 0 };
  }

  const mirrorInputs = workshopSlots.map((slot) =>
    toBusyMirrorInput(slot, userId)
  );

  const mirrorResult =
    await instructorScheduleSlotRepository.createInstructorScheduleSlots(
      admin,
      mirrorInputs
    );

  if (mirrorResult.error) {
    return {
      error:
        mirrorResult.error.message ||
        "Unable to sync instructor schedule from workshop slots.",
    };
  }

  return { error: null, count: mirrorInputs.length };
}

/** Fan out one workshop slot to every assigned instructor. */
export async function mirrorWorkshopSlotToAllInstructors(
  admin: Supabase,
  workshopSlot: InstructorScheduleSlotRecord
): Promise<MirrorSyncResult> {
  if (workshopSlot.entity_type !== ENTITY_SCHEDULE_TYPE_WORKSHOP) {
    return { error: null, count: 0 };
  }

  const instructorsResult =
    await workshopInstructorRepository.listWorkshopInstructorsByWorkshopId(
      admin,
      workshopSlot.record_id
    );

  if (instructorsResult.error) {
    return {
      error:
        instructorsResult.error.message ||
        "Unable to sync instructor schedules for workshop slot.",
    };
  }

  const instructors = instructorsResult.data ?? [];
  if (instructors.length === 0) {
    return { error: null, count: 0 };
  }

  const mirrorInputs = instructors.map((row) =>
    toBusyMirrorInput(workshopSlot, row.user_id)
  );

  const mirrorResult =
    await instructorScheduleSlotRepository.createInstructorScheduleSlots(
      admin,
      mirrorInputs
    );

  if (mirrorResult.error) {
    return {
      error:
        mirrorResult.error.message ||
        "Unable to sync instructor schedules for workshop slot.",
    };
  }

  return { error: null, count: mirrorInputs.length };
}

/** Push attribute changes from a workshop slot onto its instructor mirrors. */
export async function updateMirrorsForWorkshopSlot(
  admin: Supabase,
  workshopSlot: InstructorScheduleSlotRecord
): Promise<MirrorSyncResult> {
  const result =
    await instructorScheduleSlotRepository.updateInstructorScheduleSlotsBySourceSlotId(
      admin,
      workshopSlot.id,
      {
        name: workshopSlot.name,
        type: "busy",
        slot_date: workshopSlot.slot_date,
        day_of_week: workshopSlot.day_of_week,
        start_time: workshopSlot.start_time,
        end_time: workshopSlot.end_time,
        color: workshopSlot.color,
      }
    );

  if (result.error) {
    return {
      error:
        result.error.message ||
        "Unable to update mirrored instructor schedule slots.",
    };
  }

  return { error: null, count: result.data?.length ?? 0 };
}

export async function deleteMirrorsForWorkshopSlot(
  admin: Supabase,
  workshopSlotId: string
): Promise<MirrorSyncResult> {
  const result =
    await instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceSlotId(
      admin,
      workshopSlotId
    );

  if (result.error) {
    return {
      error:
        result.error.message ||
        "Unable to delete mirrored instructor schedule slots.",
    };
  }

  return { error: null };
}

export async function deleteAllMirrorsForWorkshop(
  admin: Supabase,
  workshopId: string
): Promise<MirrorSyncResult> {
  const result =
    await instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopId(
      admin,
      workshopId
    );

  if (result.error) {
    return {
      error:
        result.error.message ||
        "Unable to clear mirrored instructor schedule slots.",
    };
  }

  return { error: null };
}

export async function deleteMirrorsForWorkshopInstructor(
  admin: Supabase,
  workshopId: string,
  userId: string
): Promise<MirrorSyncResult> {
  const result =
    await instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopAndUser(
      admin,
      workshopId,
      userId
    );

  if (result.error) {
    return {
      error:
        result.error.message ||
        "Unable to clear instructor schedule mirrors.",
    };
  }

  return { error: null };
}

export async function deleteAllWorkshopEntitySlots(
  admin: Supabase,
  workshopId: string
): Promise<MirrorSyncResult> {
  const result =
    await instructorScheduleSlotRepository.deleteInstructorScheduleSlotsByEntityRecord(
      admin,
      ENTITY_SCHEDULE_TYPE_WORKSHOP,
      workshopId
    );

  if (result.error) {
    return {
      error:
        result.error.message ||
        "Unable to delete workshop schedule slots.",
    };
  }

  return { error: null };
}

/** Clear all mirrors for a workshop, then recopy current slots to all instructors. */
export async function recopyAllMirrorsForWorkshop(
  admin: Supabase,
  workshopId: string
): Promise<MirrorSyncResult> {
  const clearResult = await deleteAllMirrorsForWorkshop(admin, workshopId);
  if (clearResult.error) {
    return clearResult;
  }

  const instructorsResult =
    await workshopInstructorRepository.listWorkshopInstructorsByWorkshopId(
      admin,
      workshopId
    );

  if (instructorsResult.error) {
    return {
      error:
        instructorsResult.error.message ||
        "Unable to recopy workshop schedule to instructors.",
    };
  }

  const instructors = instructorsResult.data ?? [];
  let total = 0;

  for (const row of instructors) {
    const mirrorResult = await mirrorWorkshopSlotsToInstructor(
      admin,
      workshopId,
      row.user_id
    );
    if (mirrorResult.error) {
      return mirrorResult;
    }
    total += mirrorResult.count ?? 0;
  }

  return { error: null, count: total };
}
