import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findOverlappingScheduleSlot,
  SCHEDULE_SLOT_OVERLAP_MESSAGE,
} from "@/lib/manager/instructor-schedules/slot-overlap";
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
    source_workshop_id: workshopSlot.record_id,
    source_slot_id: workshopSlot.id,
  };
}

async function assertNoOverlapForMirrorInputs(
  admin: Supabase,
  mirrorInputs: CreateInstructorScheduleSlotRecordInput[],
  options?: { ignoreSourceWorkshopId?: string }
): Promise<string | null> {
  const byUser = new Map<string, CreateInstructorScheduleSlotRecordInput[]>();
  for (const input of mirrorInputs) {
    const list = byUser.get(input.record_id) ?? [];
    list.push(input);
    byUser.set(input.record_id, list);
  }

  for (const [userId, inputs] of byUser) {
    const existingResult =
      await instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord(
        admin,
        ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        userId
      );
    if (existingResult.error) {
      return (
        existingResult.error.message ||
        "Unable to verify instructor schedule overlaps."
      );
    }

    const existing = (
      (existingResult.data ?? []) as InstructorScheduleSlotRecord[]
    ).filter((row) => {
      if (
        options?.ignoreSourceWorkshopId &&
        row.source_workshop_id === options.ignoreSourceWorkshopId
      ) {
        return false;
      }
      return true;
    });

    for (const input of inputs) {
      const overlap = findOverlappingScheduleSlot(existing, {
        day_of_week: input.day_of_week,
        start_time: input.start_time,
        end_time: input.end_time,
      });
      if (overlap) {
        return SCHEDULE_SLOT_OVERLAP_MESSAGE;
      }

      // Also detect overlaps among the batch itself for the same user.
      existing.push({
        id: `pending:${input.name}:${input.day_of_week}:${input.start_time}`,
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
        created_at: "",
        updated_at: "",
      });
    }
  }

  return null;
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

  const overlapError = await assertNoOverlapForMirrorInputs(
    admin,
    mirrorInputs
  );
  if (overlapError) {
    return { error: overlapError };
  }

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

  const overlapError = await assertNoOverlapForMirrorInputs(
    admin,
    mirrorInputs
  );
  if (overlapError) {
    return { error: overlapError };
  }

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
  const instructorsResult =
    await workshopInstructorRepository.listWorkshopInstructorsByWorkshopId(
      admin,
      workshopSlot.record_id
    );

  if (instructorsResult.error) {
    return {
      error:
        instructorsResult.error.message ||
        "Unable to update mirrored instructor schedule slots.",
    };
  }

  const instructors = instructorsResult.data ?? [];
  for (const row of instructors) {
    const existingResult =
      await instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord(
        admin,
        ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        row.user_id
      );
    if (existingResult.error) {
      return {
        error:
          existingResult.error.message ||
          "Unable to verify instructor schedule overlaps.",
      };
    }

    const existing = (
      (existingResult.data ?? []) as InstructorScheduleSlotRecord[]
    ).filter(
      (slot) =>
        !(
          slot.source_slot_id === workshopSlot.id ||
          (slot.source_workshop_id === workshopSlot.record_id &&
            slot.source_slot_id === workshopSlot.id)
        )
    );

    const overlap = findOverlappingScheduleSlot(existing, {
      day_of_week: workshopSlot.day_of_week,
      start_time: workshopSlot.start_time,
      end_time: workshopSlot.end_time,
    });
    if (overlap) {
      return { error: SCHEDULE_SLOT_OVERLAP_MESSAGE };
    }
  }

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

/**
 * Clear all mirrors for a workshop, then insert a single atomic batch for every
 * instructor × workshop slot.
 */
export async function recopyAllMirrorsForWorkshop(
  admin: Supabase,
  workshopId: string
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
        "Unable to recopy workshop schedule to instructors.",
    };
  }

  const workshopSlots = (workshopSlotsResult.data ??
    []) as InstructorScheduleSlotRecord[];

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
  const mirrorInputs: CreateInstructorScheduleSlotRecordInput[] = [];
  for (const row of instructors) {
    for (const slot of workshopSlots) {
      mirrorInputs.push(toBusyMirrorInput(slot, row.user_id));
    }
  }

  if (mirrorInputs.length > 0) {
    const overlapError = await assertNoOverlapForMirrorInputs(
      admin,
      mirrorInputs,
      { ignoreSourceWorkshopId: workshopId }
    );
    if (overlapError) {
      return { error: overlapError };
    }
  }

  const clearResult = await deleteAllMirrorsForWorkshop(admin, workshopId);
  if (clearResult.error) {
    return clearResult;
  }

  if (mirrorInputs.length === 0) {
    return { error: null, count: 0 };
  }

  const mirrorResult =
    await instructorScheduleSlotRepository.createInstructorScheduleSlots(
      admin,
      mirrorInputs
    );

  if (mirrorResult.error) {
    return {
      error:
        mirrorResult.error.message ||
        "Unable to recopy workshop schedule to instructors.",
    };
  }

  return { error: null, count: mirrorInputs.length };
}
