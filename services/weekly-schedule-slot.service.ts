import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  createWeeklyScheduleSlotSchema,
  timeToMinutes,
  updateWeeklyScheduleSlotSchema,
} from "@/lib/validators/manager/weekly-schedule-slot";
import * as classRepository from "@/repositories/class.repository";
import type { ClassPickerRecord } from "@/repositories/class.repository";
import * as weeklyScheduleSlotRepository from "@/repositories/weekly-schedule-slot.repository";
import type { WeeklyScheduleSlotWithClassRecord } from "@/repositories/weekly-schedule-slot.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerWeeklyScheduleClassOption,
  ManagerWeeklyScheduleSession,
} from "@/types/manager-weekly-schedule";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateWeeklyScheduleSlotSuccess = {
  success: true;
  session: ManagerWeeklyScheduleSession;
  message: string;
};

export type CreateWeeklyScheduleSlotFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateWeeklyScheduleSlotResult =
  | CreateWeeklyScheduleSlotSuccess
  | CreateWeeklyScheduleSlotFailure;

export type UpdateWeeklyScheduleSlotSuccess = {
  success: true;
  session: ManagerWeeklyScheduleSession;
  message: string;
};

export type UpdateWeeklyScheduleSlotFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateWeeklyScheduleSlotResult =
  | UpdateWeeklyScheduleSlotSuccess
  | UpdateWeeklyScheduleSlotFailure;

export type DeleteWeeklyScheduleSlotSuccess = {
  success: true;
  message: string;
};

export type DeleteWeeklyScheduleSlotFailure = {
  success: false;
  error: string;
};

export type DeleteWeeklyScheduleSlotResult =
  | DeleteWeeklyScheduleSlotSuccess
  | DeleteWeeklyScheduleSlotFailure;

function assertManagerRole(actorRole: RoleValue | null): void {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }
}

function formatTimeForDisplay(value: string): string {
  return value.slice(0, 5);
}

function mapClassPickerRecord(
  record: ClassPickerRecord
): ManagerWeeklyScheduleClassOption {
  const subjectName = record.subjects?.name;
  const label = subjectName
    ? `${record.name} · ${subjectName}`
    : record.name;

  return {
    id: record.id,
    label,
  };
}

function mapSlotRecordToSession(
  record: WeeklyScheduleSlotWithClassRecord
): ManagerWeeklyScheduleSession {
  const teacherAssignment = record.classes?.class_teacher?.[0];
  const teacherName = teacherAssignment?.profiles?.username ?? "Unassigned";

  return {
    id: record.id,
    class_id: record.class_id,
    className: record.classes?.name ?? "Unknown class",
    subjectName: record.classes?.subjects?.name ?? "—",
    teacherName,
    room: record.room,
    day: record.day_of_week as ManagerWeeklyScheduleSession["day"],
    startTime: formatTimeForDisplay(record.start_time),
    endTime: formatTimeForDisplay(record.end_time),
  };
}

function slotsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const startMinutesA = timeToMinutes(formatTimeForDisplay(startA));
  const endMinutesA = timeToMinutes(formatTimeForDisplay(endA));
  const startMinutesB = timeToMinutes(formatTimeForDisplay(startB));
  const endMinutesB = timeToMinutes(formatTimeForDisplay(endB));

  return startMinutesA < endMinutesB && endMinutesA > startMinutesB;
}

async function hasRoomConflict(
  adminClient: Supabase,
  input: {
    room: string;
    day: string;
    start_time: string;
    end_time: string;
    excludeId?: string;
  }
): Promise<boolean> {
  const { data, error } =
    await weeklyScheduleSlotRepository.listWeeklyScheduleSlotsByRoomAndDay(
      adminClient,
      input.room,
      input.day,
      input.excludeId
    );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).some((slot) =>
    slotsOverlap(input.start_time, input.end_time, slot.start_time, slot.end_time)
  );
}

function mapMutationError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("weekly_schedule_slots_end_after_start")) {
    return "End time must be after start time.";
  }

  if (normalized.includes("foreign key")) {
    return "Selected class no longer exists.";
  }

  return "Unable to save schedule slot. Please try again.";
}

export async function listWeeklyScheduleClassOptionsForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null
): Promise<ManagerWeeklyScheduleClassOption[]> {
  assertManagerRole(actorRole);

  const { data, error } =
    await classRepository.listClassesWithSubjectForPicker(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapClassPickerRecord);
}

export async function listWeeklyScheduleSlotsForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null
): Promise<ManagerWeeklyScheduleSession[]> {
  assertManagerRole(actorRole);

  const { data, error } =
    await weeklyScheduleSlotRepository.listWeeklyScheduleSlots(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((record) =>
    mapSlotRecordToSession(record as unknown as WeeklyScheduleSlotWithClassRecord)
  );
}

export async function createWeeklyScheduleSlotForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    class_id: string;
    day: string;
    start_time: string;
    end_time: string;
    room: string;
  }
): Promise<CreateWeeklyScheduleSlotResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = createWeeklyScheduleSlotSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingClass = await classRepository.findClassById(
    adminClient,
    parsed.data.class_id
  );

  if (existingClass.error) {
    return {
      success: false,
      error: mapMutationError(existingClass.error.message),
    };
  }

  if (!existingClass.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        class_id: ["Selected class was not found."],
      },
    };
  }

  const hasConflict = await hasRoomConflict(adminClient, parsed.data);

  if (hasConflict) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        room: ["This room already has a conflicting slot at that time."],
      },
    };
  }

  const { class_id, day, start_time, end_time, room } = parsed.data;

  const { data, error } = await weeklyScheduleSlotRepository.createWeeklyScheduleSlot(
    adminClient,
    {
      class_id,
      day_of_week: day,
      start_time,
      end_time,
      room: room.trim(),
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapMutationError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "weekly_schedule_slots",
    record_id: data.id,
    new_data: {
      class_id: data.class_id,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      end_time: data.end_time,
      room: data.room,
    },
    metadata: { note: "Schedule slot created." },
  });

  return {
    success: true,
    session: mapSlotRecordToSession(
      data as unknown as WeeklyScheduleSlotWithClassRecord
    ),
    message: "Schedule slot created.",
  };
}

export async function updateWeeklyScheduleSlotForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    id: string;
    class_id: string;
    day: string;
    start_time: string;
    end_time: string;
    room: string;
  }
): Promise<UpdateWeeklyScheduleSlotResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = updateWeeklyScheduleSlotSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingSlot = await weeklyScheduleSlotRepository.findWeeklyScheduleSlotById(
    adminClient,
    parsed.data.id
  );

  if (existingSlot.error) {
    return {
      success: false,
      error: mapMutationError(existingSlot.error.message),
    };
  }

  if (!existingSlot.data) {
    return { success: false, error: "Schedule slot not found." };
  }

  const existingClass = await classRepository.findClassById(
    adminClient,
    parsed.data.class_id
  );

  if (existingClass.error) {
    return {
      success: false,
      error: mapMutationError(existingClass.error.message),
    };
  }

  if (!existingClass.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        class_id: ["Selected class was not found."],
      },
    };
  }

  const hasConflict = await hasRoomConflict(adminClient, {
    ...parsed.data,
    excludeId: parsed.data.id,
  });

  if (hasConflict) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        room: ["This room already has a conflicting slot at that time."],
      },
    };
  }

  const { id, class_id, day, start_time, end_time, room } = parsed.data;

  const { data, error } = await weeklyScheduleSlotRepository.updateWeeklyScheduleSlot(
    adminClient,
    id,
    {
      class_id,
      day_of_week: day,
      start_time,
      end_time,
      room: room.trim(),
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapMutationError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "weekly_schedule_slots",
    record_id: data.id,
    old_data: {
      class_id: existingSlot.data.class_id,
      day_of_week: existingSlot.data.day_of_week,
      start_time: existingSlot.data.start_time,
      end_time: existingSlot.data.end_time,
      room: existingSlot.data.room,
    },
    new_data: {
      class_id: data.class_id,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      end_time: data.end_time,
      room: data.room,
    },
    metadata: {
      note: "Schedule slot updated.",
      changed_fields: [
        "class_id",
        "day_of_week",
        "start_time",
        "end_time",
        "room",
      ],
    },
  });

  return {
    success: true,
    session: mapSlotRecordToSession(
      data as unknown as WeeklyScheduleSlotWithClassRecord
    ),
    message: "Schedule slot updated.",
  };
}

export async function deleteWeeklyScheduleSlotForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  slotId: string
): Promise<DeleteWeeklyScheduleSlotResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const existingSlot = await weeklyScheduleSlotRepository.findWeeklyScheduleSlotById(
    adminClient,
    slotId
  );

  if (existingSlot.error) {
    return {
      success: false,
      error: "Unable to delete schedule slot. Please try again.",
    };
  }

  if (!existingSlot.data) {
    return { success: false, error: "Schedule slot not found." };
  }

  const { error } = await weeklyScheduleSlotRepository.deleteWeeklyScheduleSlotById(
    adminClient,
    slotId
  );

  if (error) {
    return {
      success: false,
      error: "Unable to delete schedule slot. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "weekly_schedule_slots",
    record_id: slotId,
    old_data: {
      class_id: existingSlot.data.class_id,
      day_of_week: existingSlot.data.day_of_week,
      start_time: existingSlot.data.start_time,
      end_time: existingSlot.data.end_time,
      room: existingSlot.data.room,
    },
    metadata: { note: "Schedule slot deleted." },
  });

  return { success: true, message: "Schedule slot deleted." };
}
