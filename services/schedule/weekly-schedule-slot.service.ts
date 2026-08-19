import { addDays, format, parseISO } from "date-fns";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getSundayWeekBounds } from "@/lib/manager/weekly-schedule-calendar";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  createWeeklyScheduleSlotSchema,
  updateWeeklyScheduleSlotSchema,
  WEEKLY_SCHEDULE_SLOT_COLORS,
  WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR,
  WEEKLY_SCHEDULE_SLOT_TYPE_VALUES,
} from "@/lib/validators/manager/weekly-schedule-slot";
import * as weeklyScheduleSlotRepository from "@/repositories/weekly-schedule-slot.repository";
import type {
  WeeklyScheduleSlotRecord,
} from "@/repositories/weekly-schedule-slot.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  CopyWeeklySchedulePreview,
  CopyWeeklyScheduleSlotPreviewItem,
  CopyWeeklyScheduleSlotSkipItem,
  ManagerWeeklyScheduleSession,
  WeeklyScheduleSlotType,
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

export type CopyWeeklyScheduleSuccess = {
  success: true;
  message: string;
  createdCount: number;
  skippedCount: number;
};

export type CopyWeeklyScheduleFailure = {
  success: false;
  error: string;
};

export type CopyWeeklyScheduleResult =
  | CopyWeeklyScheduleSuccess
  | CopyWeeklyScheduleFailure;

function formatTimeForDisplay(value: string): string {
  return value.slice(0, 5);
}

function formatDateOnly(value: string | Date): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return format(value, "yyyy-MM-dd");
}

function isWeeklyScheduleSlotType(
  value: string
): value is WeeklyScheduleSlotType {
  return (WEEKLY_SCHEDULE_SLOT_TYPE_VALUES as readonly string[]).includes(
    value
  );
}

function normalizeSlotColor(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  const match = WEEKLY_SCHEDULE_SLOT_COLORS.find(
    (color) => color.toLowerCase() === normalized
  );
  return match ?? WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR;
}

function mapSlotRecordToSession(
  record: WeeklyScheduleSlotRecord
): ManagerWeeklyScheduleSession {
  return {
    id: record.id,
    name: record.name,
    type: isWeeklyScheduleSlotType(record.type) ? record.type : "class",
    slotDate: formatDateOnly(record.slot_date),
    startTime: formatTimeForDisplay(record.start_time),
    endTime: formatTimeForDisplay(record.end_time),
    color: normalizeSlotColor(record.color),
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

  if (normalized.includes("weekly_schedule_slots_end_after_start")) {
    return "End time must be after start time.";
  }

  if (normalized.includes("weekly_schedule_slots_type_check")) {
    return "Type must be class, workshop, online, or meeting.";
  }

  if (normalized.includes("weekly_schedule_slots_color_hex_check")) {
    return "Color must be a valid hex code.";
  }

  if (
    normalized.includes("weekly_schedule_slots_name_date_time_key") ||
    normalized.includes("duplicate key")
  ) {
    return "A slot with this name, date, and time already exists.";
  }

  return "Unable to save schedule slot. Please try again.";
}

async function buildCopyPreview(
  adminClient: Supabase,
  weekAnchorIso: string
): Promise<CopyWeeklySchedulePreview> {
  const bounds = getSundayWeekBounds(weekAnchorIso);

  const [lastWeekResult, thisWeekResult] = await Promise.all([
    weeklyScheduleSlotRepository.listWeeklyScheduleSlotsInDateRange(
      adminClient,
      bounds.lastWeekStart,
      bounds.lastWeekEnd
    ),
    weeklyScheduleSlotRepository.listWeeklyScheduleSlotsInDateRange(
      adminClient,
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

  const willCreate: CopyWeeklyScheduleSlotPreviewItem[] = [];
  const willSkip: CopyWeeklyScheduleSlotSkipItem[] = [];

  for (const source of lastWeekResult.data ?? []) {
    const sourceDate = formatDateOnly(source.slot_date);
    const targetDate = format(addDays(parseISO(sourceDate), 7), "yyyy-MM-dd");
    const item: CopyWeeklyScheduleSlotPreviewItem = {
      name: source.name,
      type: isWeeklyScheduleSlotType(source.type) ? source.type : "class",
      slotDate: targetDate,
      startTime: formatTimeForDisplay(source.start_time),
      endTime: formatTimeForDisplay(source.end_time),
      color: normalizeSlotColor(source.color),
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
    ...bounds,
    willCreate,
    willSkip,
  };
}

export async function listWeeklyScheduleSlotsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  options: { weekStart: string }
): Promise<ManagerWeeklyScheduleSession[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SCHEDULE_VIEW);

  const bounds = getSundayWeekBounds(options.weekStart);
  const { data, error } =
    await weeklyScheduleSlotRepository.listWeeklyScheduleSlotsInDateRange(
      adminClient,
      bounds.weekStart,
      bounds.weekEnd
    );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((record) =>
    mapSlotRecordToSession(record as WeeklyScheduleSlotRecord)
  );
}

export async function createWeeklyScheduleSlotForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    name: string;
    type: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    color: string;
  }
): Promise<CreateWeeklyScheduleSlotResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SCHEDULE_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createWeeklyScheduleSlotSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, type, slot_date, start_time, end_time, color } = parsed.data;

  const { data, error } = await weeklyScheduleSlotRepository.createWeeklyScheduleSlot(
    adminClient,
    {
      name: name.trim(),
      type,
      slot_date,
      start_time,
      end_time,
      color,
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
      name: data.name,
      type: data.type,
      slot_date: data.slot_date,
      start_time: data.start_time,
      end_time: data.end_time,
      color: data.color,
    },
    metadata: { note: "Schedule slot created." },
  });

  return {
    success: true,
    session: mapSlotRecordToSession(data as WeeklyScheduleSlotRecord),
    message: "Schedule slot created.",
  };
}

export async function updateWeeklyScheduleSlotForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    name: string;
    type: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    color: string;
  }
): Promise<UpdateWeeklyScheduleSlotResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SCHEDULE_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateWeeklyScheduleSlotSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingSlot =
    await weeklyScheduleSlotRepository.findWeeklyScheduleSlotById(
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

  const { id, name, type, slot_date, start_time, end_time, color } =
    parsed.data;

  const { data, error } =
    await weeklyScheduleSlotRepository.updateWeeklyScheduleSlot(
      adminClient,
      id,
      {
        name: name.trim(),
        type,
        slot_date,
        start_time,
        end_time,
        color,
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
      name: existingSlot.data.name,
      type: existingSlot.data.type,
      slot_date: existingSlot.data.slot_date,
      start_time: existingSlot.data.start_time,
      end_time: existingSlot.data.end_time,
      color: existingSlot.data.color,
    },
    new_data: {
      name: data.name,
      type: data.type,
      slot_date: data.slot_date,
      start_time: data.start_time,
      end_time: data.end_time,
      color: data.color,
    },
    metadata: {
      note: "Schedule slot updated.",
      changed_fields: [
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
    session: mapSlotRecordToSession(data as WeeklyScheduleSlotRecord),
    message: "Schedule slot updated.",
  };
}

export async function deleteWeeklyScheduleSlotForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  slotId: string
): Promise<DeleteWeeklyScheduleSlotResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SCHEDULE_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existingSlot =
    await weeklyScheduleSlotRepository.findWeeklyScheduleSlotById(
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

  const { error } =
    await weeklyScheduleSlotRepository.deleteWeeklyScheduleSlotById(
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
      name: existingSlot.data.name,
      type: existingSlot.data.type,
      slot_date: existingSlot.data.slot_date,
      start_time: existingSlot.data.start_time,
      end_time: existingSlot.data.end_time,
      color: existingSlot.data.color,
    },
    metadata: { note: "Schedule slot deleted." },
  });

  return { success: true, message: "Schedule slot deleted." };
}

export async function previewCopyLastWeekScheduleForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  weekAnchorIso: string
): Promise<
  | { success: true; preview: CopyWeeklySchedulePreview }
  | { success: false; error: string }
> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SCHEDULE_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  try {
    const preview = await buildCopyPreview(adminClient, weekAnchorIso);
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

export async function copyLastWeekScheduleForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  weekAnchorIso: string
): Promise<CopyWeeklyScheduleResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SCHEDULE_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  let preview: CopyWeeklySchedulePreview;
  try {
    preview = await buildCopyPreview(adminClient, weekAnchorIso);
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

  const { data, error } =
    await weeklyScheduleSlotRepository.copyWeeklyScheduleFromLastWeek(
      adminClient,
      preview.weekStart
    );

  if (error) {
    return {
      success: false,
      error: mapMutationError(error.message),
    };
  }

  const result = data as {
    created_count?: number;
    skipped_count?: number;
  } | null;
  const createdCount = result?.created_count ?? 0;
  const skippedCount = result?.skipped_count ?? preview.willSkip.length;

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "weekly_schedule_slots",
    record_id: null,
    new_data: {
      created_count: createdCount,
      week_start: preview.weekStart,
      last_week_start: preview.lastWeekStart,
    },
    metadata: {
      note: "Copied schedule slots from last week.",
      created_count: createdCount,
      skipped_count: skippedCount,
    },
  });

  return {
    success: true,
    createdCount,
    skippedCount,
    message: `Copied ${createdCount} slot${createdCount === 1 ? "" : "s"} from last week${
      skippedCount > 0 ? ` (${skippedCount} skipped)` : ""
    }.`,
  };
}
