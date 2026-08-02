import { addDays, format, parseISO } from "date-fns";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getSundayWeekBounds } from "@/lib/manager/weekly-schedule-calendar";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/authorization.service";
import {
  createInstructorScheduleSlotSchema,
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  normalizeInstructorScheduleSlotColor,
  updateInstructorScheduleSlotSchema,
  INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES,
} from "@/lib/validators/manager/instructor-schedule-slot";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import type {
  CreateInstructorScheduleSlotRecordInput,
  InstructorScheduleSlotRecord,
} from "@/repositories/instructor-schedule-slot.repository";
import * as profileRepository from "@/repositories/profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  CopyInstructorSchedulePreview,
  CopyInstructorScheduleSlotPreviewItem,
  CopyInstructorScheduleSlotSkipItem,
  InstructorScheduleSlotType,
  ManagerInstructorScheduleSession,
  ManagerInstructorScheduleTab,
  ManagerInstructorSchedulesPageData,
} from "@/types/manager-instructor-schedule";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateInstructorScheduleSlotSuccess = {
  success: true;
  session: ManagerInstructorScheduleSession;
  message: string;
};

export type CreateInstructorScheduleSlotFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateInstructorScheduleSlotResult =
  | CreateInstructorScheduleSlotSuccess
  | CreateInstructorScheduleSlotFailure;

export type UpdateInstructorScheduleSlotSuccess = {
  success: true;
  session: ManagerInstructorScheduleSession;
  message: string;
};

export type UpdateInstructorScheduleSlotFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateInstructorScheduleSlotResult =
  | UpdateInstructorScheduleSlotSuccess
  | UpdateInstructorScheduleSlotFailure;

export type DeleteInstructorScheduleSlotSuccess = {
  success: true;
  message: string;
};

export type DeleteInstructorScheduleSlotFailure = {
  success: false;
  error: string;
};

export type DeleteInstructorScheduleSlotResult =
  | DeleteInstructorScheduleSlotSuccess
  | DeleteInstructorScheduleSlotFailure;

export type CopyInstructorScheduleSuccess = {
  success: true;
  message: string;
  createdCount: number;
  skippedCount: number;
};

export type CopyInstructorScheduleFailure = {
  success: false;
  error: string;
};

export type CopyInstructorScheduleResult =
  | CopyInstructorScheduleSuccess
  | CopyInstructorScheduleFailure;

function formatTimeForDisplay(value: string): string {
  return value.slice(0, 5);
}

function formatDateOnly(value: string | Date): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return format(value, "yyyy-MM-dd");
}

function isInstructorScheduleSlotType(
  value: string
): value is InstructorScheduleSlotType {
  return (INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES as readonly string[]).includes(
    value
  );
}

function mapSlotRecordToSession(
  record: InstructorScheduleSlotRecord
): ManagerInstructorScheduleSession {
  return {
    id: record.id,
    recordId: record.record_id,
    name: record.name,
    type: isInstructorScheduleSlotType(record.type) ? record.type : "busy",
    slotDate: formatDateOnly(record.slot_date),
    startTime: formatTimeForDisplay(record.start_time),
    endTime: formatTimeForDisplay(record.end_time),
    color: normalizeInstructorScheduleSlotColor(record.color),
  };
}

function slotIdentityKey(input: {
  name: string;
  slotDate: string;
  startTime: string;
  endTime: string;
}): string {
  return [
    input.name.trim().toLowerCase(),
    formatDateOnly(input.slotDate),
    formatTimeForDisplay(input.startTime),
    formatTimeForDisplay(input.endTime),
  ].join("|");
}

function mapMutationError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("instructor_schedule_slots_end_after_start")) {
    return "End time must be after start time.";
  }

  if (normalized.includes("instructor_schedule_slots_type_check")) {
    return "Type must be free or busy.";
  }

  if (normalized.includes("instructor_schedule_slots_color_hex_check")) {
    return "Color must be a valid hex code.";
  }

  if (
    normalized.includes(
      "instructor_schedule_slots_entity_record_name_date_time_key"
    ) ||
    normalized.includes("instructor_schedule_slots_user_name_date_time_key") ||
    normalized.includes("duplicate key")
  ) {
    return "A slot with this name, date, and time already exists for this instructor.";
  }

  if (normalized.includes("instructor_schedule_slots_entity_type_check")) {
    return "Invalid schedule entity type.";
  }

  return "Unable to save schedule slot. Please try again.";
}

async function assertInstructorRecord(
  adminClient: Supabase,
  recordId: string
): Promise<string | null> {
  const { data, error } = await profileRepository.findProfileById(
    adminClient,
    recordId
  );

  if (error) {
    return "Unable to verify instructor. Please try again.";
  }

  if (!data) {
    return "Instructor not found.";
  }

  if (!data.is_instructor) {
    return "Selected user is not an instructor.";
  }

  return null;
}

async function buildCopyPreview(
  adminClient: Supabase,
  recordId: string,
  weekAnchorIso: string
): Promise<CopyInstructorSchedulePreview> {
  const bounds = getSundayWeekBounds(weekAnchorIso);

  const [lastWeekResult, thisWeekResult] = await Promise.all([
    instructorScheduleSlotRepository.listInstructorScheduleSlotsInDateRangeForRecord(
      adminClient,
      ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      recordId,
      bounds.lastWeekStart,
      bounds.lastWeekEnd
    ),
    instructorScheduleSlotRepository.listInstructorScheduleSlotsInDateRangeForRecord(
      adminClient,
      ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      recordId,
      bounds.weekStart,
      bounds.weekEnd
    ),
  ]);

  if (lastWeekResult.error) {
    throw new Error(lastWeekResult.error.message);
  }

  if (thisWeekResult.error) {
    throw new Error(thisWeekResult.error.message);
  }

  const existingKeys = new Set(
    (thisWeekResult.data ?? []).map((row) =>
      slotIdentityKey({
        name: row.name,
        slotDate: row.slot_date,
        startTime: row.start_time,
        endTime: row.end_time,
      })
    )
  );

  const willCreate: CopyInstructorScheduleSlotPreviewItem[] = [];
  const willSkip: CopyInstructorScheduleSlotSkipItem[] = [];

  for (const source of lastWeekResult.data ?? []) {
    const sourceDate = formatDateOnly(source.slot_date);
    const targetDate = format(addDays(parseISO(sourceDate), 7), "yyyy-MM-dd");
    const item: CopyInstructorScheduleSlotPreviewItem = {
      recordId,
      name: source.name,
      type: isInstructorScheduleSlotType(source.type) ? source.type : "busy",
      slotDate: targetDate,
      startTime: formatTimeForDisplay(source.start_time),
      endTime: formatTimeForDisplay(source.end_time),
      color: normalizeInstructorScheduleSlotColor(source.color),
      sourceSlotDate: sourceDate,
    };

    const key = slotIdentityKey(item);
    if (existingKeys.has(key)) {
      willSkip.push({
        ...item,
        reason: "Already exists on this week",
      });
      continue;
    }

    willCreate.push(item);
    existingKeys.add(key);
  }

  return {
    recordId,
    ...bounds,
    willCreate,
    willSkip,
  };
}

export async function getInstructorSchedulesPageForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerInstructorSchedulesPageData> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  const [instructorsResult, slotsResult] = await Promise.all([
    profileRepository.listInstructorProfiles(adminClient),
    instructorScheduleSlotRepository.listInstructorScheduleSlotsByEntity(adminClient, ENTITY_SCHEDULE_TYPE_INSTRUCTOR),
  ]);

  if (instructorsResult.error) {
    throw new Error(instructorsResult.error.message);
  }

  if (slotsResult.error) {
    throw new Error(slotsResult.error.message);
  }

  const instructors: ManagerInstructorScheduleTab[] = (
    instructorsResult.data ?? []
  ).map((row) => ({
    id: row.id,
    username: row.username,
  }));

  return {
    instructors,
    sessions: (slotsResult.data ?? []).map((record) =>
      mapSlotRecordToSession(record as InstructorScheduleSlotRecord)
    ),
  };
}

export async function createInstructorScheduleSlotForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    record_id: string;
    name: string;
    type: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    color: string;
  }
): Promise<CreateInstructorScheduleSlotResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createInstructorScheduleSlotSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const instructorError = await assertInstructorRecord(
    adminClient,
    parsed.data.record_id
  );
  if (instructorError) {
    return { success: false, error: instructorError };
  }

  const { record_id, name, type, slot_date, start_time, end_time, color } =
    parsed.data;

  const { data, error } =
    await instructorScheduleSlotRepository.createInstructorScheduleSlot(
      adminClient,
      {
        entity_type: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        record_id,
        name: name.trim(),
        type,
        slot_date,
        start_time,
        end_time,
        color: normalizeInstructorScheduleSlotColor(color),
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
    table_name: "instructor_schedule_slots",
    record_id: data.id,
    new_data: {
      entity_type: data.entity_type,
      record_id: data.record_id,
      name: data.name,
      type: data.type,
      slot_date: data.slot_date,
      start_time: data.start_time,
      end_time: data.end_time,
      color: data.color,
    },
    metadata: { note: "Instructor schedule slot created." },
  });

  return {
    success: true,
    session: mapSlotRecordToSession(data as InstructorScheduleSlotRecord),
    message: "Schedule slot created.",
  };
}

export async function updateInstructorScheduleSlotForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    record_id: string;
    name: string;
    type: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    color: string;
  }
): Promise<UpdateInstructorScheduleSlotResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateInstructorScheduleSlotSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingSlot =
    await instructorScheduleSlotRepository.findInstructorScheduleSlotById(
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

  if (existingSlot.data.entity_type !== ENTITY_SCHEDULE_TYPE_INSTRUCTOR) {
    return { success: false, error: "Schedule slot not found." };
  }

  const instructorError = await assertInstructorRecord(
    adminClient,
    parsed.data.record_id
  );
  if (instructorError) {
    return { success: false, error: instructorError };
  }

  const { id, record_id, name, type, slot_date, start_time, end_time, color } =
    parsed.data;

  const { data, error } =
    await instructorScheduleSlotRepository.updateInstructorScheduleSlot(
      adminClient,
      id,
      {
        entity_type: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        record_id,
        name: name.trim(),
        type,
        slot_date,
        start_time,
        end_time,
        color: normalizeInstructorScheduleSlotColor(color),
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
    table_name: "instructor_schedule_slots",
    record_id: data.id,
    old_data: {
      entity_type: existingSlot.data.entity_type,
      record_id: existingSlot.data.record_id,
      name: existingSlot.data.name,
      type: existingSlot.data.type,
      slot_date: existingSlot.data.slot_date,
      start_time: existingSlot.data.start_time,
      end_time: existingSlot.data.end_time,
      color: existingSlot.data.color,
    },
    new_data: {
      entity_type: data.entity_type,
      record_id: data.record_id,
      name: data.name,
      type: data.type,
      slot_date: data.slot_date,
      start_time: data.start_time,
      end_time: data.end_time,
      color: data.color,
    },
    metadata: {
      note: "Instructor schedule slot updated.",
      changed_fields: [
        "record_id",
        "name",
        "type",
        "slot_date",
        "start_time",
        "end_time",
        "color",
      ],
    },
  });

  return {
    success: true,
    session: mapSlotRecordToSession(data as InstructorScheduleSlotRecord),
    message: "Schedule slot updated.",
  };
}

export async function deleteInstructorScheduleSlotForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  slotId: string
): Promise<DeleteInstructorScheduleSlotResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existingSlot =
    await instructorScheduleSlotRepository.findInstructorScheduleSlotById(
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

  if (existingSlot.data.entity_type !== ENTITY_SCHEDULE_TYPE_INSTRUCTOR) {
    return { success: false, error: "Schedule slot not found." };
  }

  const { error } =
    await instructorScheduleSlotRepository.deleteInstructorScheduleSlotById(
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
    table_name: "instructor_schedule_slots",
    record_id: slotId,
    old_data: {
      entity_type: existingSlot.data.entity_type,
      record_id: existingSlot.data.record_id,
      name: existingSlot.data.name,
      type: existingSlot.data.type,
      slot_date: existingSlot.data.slot_date,
      start_time: existingSlot.data.start_time,
      end_time: existingSlot.data.end_time,
      color: existingSlot.data.color,
    },
    metadata: { note: "Instructor schedule slot deleted." },
  });

  return { success: true, message: "Schedule slot deleted." };
}

export async function previewCopyLastWeekInstructorScheduleForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  recordId: string,
  weekAnchorIso: string
): Promise<
  | { success: true; preview: CopyInstructorSchedulePreview }
  | { success: false; error: string }
> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const instructorError = await assertInstructorRecord(adminClient, recordId);
  if (instructorError) {
    return { success: false, error: instructorError };
  }

  try {
    const preview = await buildCopyPreview(
      adminClient,
      recordId,
      weekAnchorIso
    );
    return { success: true, preview };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to preview copy. Please try again.",
    };
  }
}

export async function copyLastWeekInstructorScheduleForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  recordId: string,
  weekAnchorIso: string
): Promise<CopyInstructorScheduleResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const instructorError = await assertInstructorRecord(adminClient, recordId);
  if (instructorError) {
    return { success: false, error: instructorError };
  }

  let preview: CopyInstructorSchedulePreview;
  try {
    preview = await buildCopyPreview(adminClient, recordId, weekAnchorIso);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to copy last week. Please try again.",
    };
  }

  if (preview.willCreate.length === 0) {
    return {
      success: true,
      createdCount: 0,
      skippedCount: preview.willSkip.length,
      message:
        preview.willSkip.length > 0
          ? `Nothing to copy. ${preview.willSkip.length} slot${preview.willSkip.length === 1 ? "" : "s"} already exist this week.`
          : "Nothing to copy. Last week has no slots.",
    };
  }

  const inputs: CreateInstructorScheduleSlotRecordInput[] =
    preview.willCreate.map((item) => ({
      entity_type: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      record_id: recordId,
      name: item.name,
      type: item.type,
      slot_date: item.slotDate,
      start_time: item.startTime,
      end_time: item.endTime,
      color: item.color,
    }));

  const { data, error } =
    await instructorScheduleSlotRepository.createInstructorScheduleSlots(
      adminClient,
      inputs
    );

  if (error) {
    return {
      success: false,
      error: mapMutationError(error.message),
    };
  }

  const created = data ?? [];

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "instructor_schedule_slots",
    record_id: created[0]?.id ?? null,
    new_data: {
      created_count: created.length,
      entity_type: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      record_id: recordId,
      week_start: preview.weekStart,
      last_week_start: preview.lastWeekStart,
    },
    metadata: {
      note: "Copied instructor schedule slots from last week.",
      created_count: created.length,
      skipped_count: preview.willSkip.length,
    },
  });

  return {
    success: true,
    createdCount: created.length,
    skippedCount: preview.willSkip.length,
    message: `Copied ${created.length} slot${created.length === 1 ? "" : "s"} from last week${
      preview.willSkip.length > 0
        ? ` (${preview.willSkip.length} skipped)`
        : ""
    }.`,
  };
}
