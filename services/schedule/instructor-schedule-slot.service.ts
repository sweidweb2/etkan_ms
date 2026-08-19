import { format } from "date-fns";
import { unstable_cache } from "next/cache";
import {
  WORKSHOP_STATUSES,
  type WorkshopStatusValue,
} from "@/lib/constants/manager-workshop-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import { INSTRUCTOR_SCHEDULE_CACHE_TAGS } from "@/lib/cache/instructor-schedule-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertPermission,
  getUnauthorizedError,
  hasPermission,
} from "@/services/auth/authorization.service";
import {
  deleteMirrorsForWorkshopSlot,
  mirrorWorkshopSlotToAllInstructors,
  updateMirrorsForWorkshopSlot,
} from "@/lib/manager/workshops/mirror-instructor-schedule";
import {
  findOverlappingScheduleSlot,
  SCHEDULE_SLOT_OVERLAP_MESSAGE,
} from "@/lib/manager/instructor-schedules/slot-overlap";
import {
  isWorkshopContentMutationLocked,
  WORKSHOP_CONTENT_LOCKED_MESSAGE,
} from "@/lib/manager/workshops/status-transitions";
import {
  createInstructorScheduleSlotSchema,
  dayOfWeekFromIsoDate,
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  ENTITY_SCHEDULE_TYPE_VALUES,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
  getInstructorScheduleSlotDisplayColor,
  resolveInstructorScheduleSlotType,
  updateInstructorScheduleSlotSchema,
  INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES,
} from "@/lib/validators/manager/instructor-schedule-slot";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import type { InstructorScheduleSlotRecord } from "@/repositories/instructor-schedule-slot.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import type { WorkshopRecord } from "@/repositories/workshop.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  InstructorScheduleSlotType,
  ManagerInstructorScheduleSession,
  ManagerInstructorScheduleTab,
  ManagerInstructorSchedulesPageData,
  ManagerInstructorScheduleSlotsDetailsData,
  ManagerScheduleWorkshopTab,
  InstructorScheduleCalendarScope,
  ScheduleEntityType,
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

function formatTimeForDisplay(value: string): string {
  return value.slice(0, 5);
}

function formatDateOnly(value: string | Date): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return format(value, "yyyy-MM-dd");
}

function todayIsoDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function isInstructorScheduleSlotType(
  value: string
): value is InstructorScheduleSlotType {
  return (INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES as readonly string[]).includes(
    value
  );
}

function isScheduleEntityType(value: string): value is ScheduleEntityType {
  return (ENTITY_SCHEDULE_TYPE_VALUES as readonly string[]).includes(value);
}

function isWorkshopStatus(value: string): value is WorkshopStatusValue {
  return (Object.values(WORKSHOP_STATUSES) as string[]).includes(value);
}

function mapSlotRecordToSession(
  record: InstructorScheduleSlotRecord
): ManagerInstructorScheduleSession {
  return {
    id: record.id,
    entityType: isScheduleEntityType(record.entity_type)
      ? record.entity_type
      : ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
    recordId: record.record_id,
    name: record.name,
    type: isInstructorScheduleSlotType(record.type) ? record.type : "busy",
    slotDate: formatDateOnly(record.slot_date),
    dayOfWeek: record.day_of_week,
    startTime: formatTimeForDisplay(record.start_time),
    endTime: formatTimeForDisplay(record.end_time),
    color: getInstructorScheduleSlotDisplayColor({
      entityType: isScheduleEntityType(record.entity_type)
        ? record.entity_type
        : ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      recordId: record.record_id,
      sourceWorkshopId: record.source_workshop_id,
    }),
    sourceWorkshopId: record.source_workshop_id ?? null,
    sourceSlotId: record.source_slot_id ?? null,
  };
}

export function mapInstructorScheduleSlotRecordToSession(
  record: InstructorScheduleSlotRecord
): ManagerInstructorScheduleSession {
  return mapSlotRecordToSession(record);
}

export async function listScheduleSlotsByRecordForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  entityType: ScheduleEntityType,
  recordId: string
): Promise<ManagerInstructorScheduleSession[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  const result =
    await instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord(
      adminClient,
      entityType,
      recordId
    );

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []).map((record) =>
    mapSlotRecordToSession(record as InstructorScheduleSlotRecord)
  );
}

export function isWorkshopEligibleForScheduleCreate(
  workshop: Pick<WorkshopRecord, "status" | "end_date">,
  today = todayIsoDate()
): boolean {
  if (
    workshop.status === WORKSHOP_STATUSES.CANCELLED ||
    workshop.status === WORKSHOP_STATUSES.COMPLETED
  ) {
    return false;
  }

  if (workshop.end_date == null || workshop.end_date === "") {
    return true;
  }

  return formatDateOnly(workshop.end_date) >= today;
}

function mapMutationError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("instructor_schedule_slots_end_after_start")) {
    return "End time must be after start time.";
  }

  if (normalized.includes("instructor_schedule_slots_type_check")) {
    return "Type must be free or busy.";
  }

  if (normalized.includes("instructor_schedule_slots_day_of_week_check")) {
    return "Weekday must be between Sunday and Saturday.";
  }

  if (
    normalized.includes(
      "instructor_schedule_slots_entity_record_name_dow_time_key"
    ) ||
    normalized.includes(
      "instructor_schedule_slots_entity_record_name_date_time_key"
    ) ||
    normalized.includes("instructor_schedule_slots_user_name_date_time_key") ||
    normalized.includes("duplicate key")
  ) {
    return "A slot with this name, weekday, and time already exists for this entity.";
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

async function assertWorkshopRecordForSchedule(
  adminClient: Supabase,
  recordId: string,
  options?: {
    requireEligibleForCreate?: boolean;
    requireMutableContent?: boolean;
  }
): Promise<string | null> {
  const { data, error } = await workshopRepository.findWorkshopById(
    adminClient,
    recordId
  );

  if (error) {
    return "Unable to verify workshop. Please try again.";
  }

  if (!data) {
    return "Workshop not found.";
  }

  if (options?.requireMutableContent) {
    if (isWorkshopContentMutationLocked(data.status)) {
      return WORKSHOP_CONTENT_LOCKED_MESSAGE;
    }
  }

  if (options?.requireEligibleForCreate) {
    if (!isWorkshopEligibleForScheduleCreate(data)) {
      return "This workshop cannot receive new schedule slots (ended, completed, or cancelled).";
    }
  }

  return null;
}

async function assertScheduleEntityRecord(
  adminClient: Supabase,
  entityType: ScheduleEntityType,
  recordId: string,
  options?: { requireEligibleForCreate?: boolean }
): Promise<string | null> {
  if (entityType === ENTITY_SCHEDULE_TYPE_INSTRUCTOR) {
    return assertInstructorRecord(adminClient, recordId);
  }

  return assertWorkshopRecordForSchedule(adminClient, recordId, options);
}

async function fetchScheduleInstructorTabs(): Promise<
  ManagerInstructorScheduleTab[]
> {
  const adminClient = createSupabaseAdminClient();
  const instructorsResult =
    await profileRepository.listInstructorProfiles(adminClient);

  if (instructorsResult.error) {
    throw new Error(instructorsResult.error.message);
  }

  return (instructorsResult.data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
  }));
}

const listScheduleInstructorTabsCached = unstable_cache(
  fetchScheduleInstructorTabs,
  ["manager-schedule-instructors"],
  {
    tags: [INSTRUCTOR_SCHEDULE_CACHE_TAGS.INSTRUCTORS],
    revalidate: 3600,
  }
);

/**
 * Instructor tabs for the schedule page.
 * Auth is checked outside the cache; the list body is shared-server-cached.
 */
export async function listScheduleInstructorTabsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerInstructorScheduleTab[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );
  return listScheduleInstructorTabsCached();
}

export async function getInstructorSchedulesPageForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerInstructorSchedulesPageData> {
  const timer = createNavStepTimer("getInstructorSchedulesPage");
  try {
    await timer.step("auth", () =>
      assertPermission(
        adminClient,
        actorUserId,
        PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
      )
    );

    const canCreate = await timer.step("canCreate", () =>
      hasPermission(
        adminClient,
        actorUserId ?? "",
        PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE
      )
    );

    const [instructors, workshops] = await timer.step("tabs", () =>
      Promise.all([
        listScheduleInstructorTabsCached(),
        canCreate
          ? listEligibleWorkshopsForScheduleCached()
          : Promise.resolve([] as ManagerScheduleWorkshopTab[]),
      ])
    );

    const firstInstructorId = instructors[0]?.id ?? null;
    const sessions = await timer.step("sessions", () =>
      firstInstructorId
        ? loadCalendarSessionsForScope(adminClient, {
            kind: "instructor",
            recordId: firstInstructorId,
          })
        : Promise.resolve([] as ManagerInstructorScheduleSession[])
    );

    return {
      instructors,
      workshops,
      sessions,
      initialBrowse: {
        kind: "instructor",
        recordId: firstInstructorId,
      },
    };
  } finally {
    timer.end();
  }
}

async function resolveLockedWorkshopIdsFromDb(
  adminClient: Supabase
): Promise<string[]> {
  const lockResult = await workshopRepository.listWorkshopLockStatuses(
    adminClient
  );

  if (lockResult.error) {
    throw new Error(lockResult.error.message);
  }

  return resolveLockedWorkshopIds(lockResult.data ?? []);
}

function mapSlotRecords(
  records: InstructorScheduleSlotRecord[] | null | undefined
): ManagerInstructorScheduleSession[] {
  return (records ?? []).map((record) =>
    mapSlotRecordToSession(record as InstructorScheduleSlotRecord)
  );
}

async function loadCalendarSessionsForScope(
  adminClient: Supabase,
  scope: InstructorScheduleCalendarScope
): Promise<ManagerInstructorScheduleSession[]> {
  if (scope.kind === "instructor" && scope.recordId) {
    const result =
      await instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord(
        adminClient,
        ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        scope.recordId
      );
    if (result.error) {
      throw new Error(result.error.message);
    }
    return mapSlotRecords(result.data);
  }

  if (scope.kind === "workshop" && scope.recordId) {
    const result =
      await instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord(
        adminClient,
        ENTITY_SCHEDULE_TYPE_WORKSHOP,
        scope.recordId
      );
    if (result.error) {
      throw new Error(result.error.message);
    }
    return mapSlotRecords(result.data);
  }

  if (scope.kind === "instructor") {
    const result =
      await instructorScheduleSlotRepository.listInstructorScheduleSlotsByEntity(
        adminClient,
        ENTITY_SCHEDULE_TYPE_INSTRUCTOR
      );
    if (result.error) {
      throw new Error(result.error.message);
    }
    return mapSlotRecords(result.data);
  }

  if (scope.kind === "workshop") {
    const lockedWorkshopIds = await resolveLockedWorkshopIdsFromDb(adminClient);
    const result =
      await instructorScheduleSlotRepository.listInstructorScheduleSlotsByEntity(
        adminClient,
        ENTITY_SCHEDULE_TYPE_WORKSHOP,
        { excludeWorkshopRecordIds: lockedWorkshopIds }
      );
    if (result.error) {
      throw new Error(result.error.message);
    }
    return mapSlotRecords(result.data);
  }

  const lockedWorkshopIds = await resolveLockedWorkshopIdsFromDb(adminClient);
  const [instructorResult, workshopResult] = await Promise.all([
    instructorScheduleSlotRepository.listInstructorScheduleSlotsByEntity(
      adminClient,
      ENTITY_SCHEDULE_TYPE_INSTRUCTOR
    ),
    instructorScheduleSlotRepository.listInstructorScheduleSlotsByEntity(
      adminClient,
      ENTITY_SCHEDULE_TYPE_WORKSHOP,
      { excludeWorkshopRecordIds: lockedWorkshopIds }
    ),
  ]);

  if (instructorResult.error) {
    throw new Error(instructorResult.error.message);
  }
  if (workshopResult.error) {
    throw new Error(workshopResult.error.message);
  }

  return [
    ...mapSlotRecords(instructorResult.data),
    ...mapSlotRecords(workshopResult.data),
  ];
}

export async function listInstructorScheduleSlotsForCalendarForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  scope: InstructorScheduleCalendarScope
): Promise<ManagerInstructorScheduleSession[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  return loadCalendarSessionsForScope(adminClient, scope);
}

function mapWorkshopRowsToEligibleTabs(
  rows: Array<{
    id: string;
    name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
  }>
): ManagerScheduleWorkshopTab[] {
  return rows
    .map((row) => {
      const status = isWorkshopStatus(row.status)
        ? row.status
        : WORKSHOP_STATUSES.DRAFT;
      const eligible = isWorkshopEligibleForScheduleCreate({
        status: row.status,
        end_date: row.end_date,
      });
      return {
        id: row.id,
        name: row.name,
        start_date: row.start_date ? formatDateOnly(row.start_date) : null,
        end_date: row.end_date ? formatDateOnly(row.end_date) : null,
        status,
        eligible_for_create: eligible,
      };
    })
    .filter((workshop) => workshop.eligible_for_create);
}

async function fetchEligibleWorkshopsForSchedule(): Promise<
  ManagerScheduleWorkshopTab[]
> {
  const adminClient = createSupabaseAdminClient();
  const workshopsResult =
    await workshopRepository.listWorkshopsForScheduleTabs(adminClient);

  if (workshopsResult.error) {
    throw new Error(workshopsResult.error.message);
  }

  return mapWorkshopRowsToEligibleTabs(workshopsResult.data ?? []);
}

const listEligibleWorkshopsForScheduleCached = unstable_cache(
  fetchEligibleWorkshopsForSchedule,
  ["manager-schedule-eligible-workshops"],
  {
    tags: [INSTRUCTOR_SCHEDULE_CACHE_TAGS.ELIGIBLE_WORKSHOPS],
    revalidate: 3600,
  }
);

/**
 * Eligible workshops for schedule create/filter tabs.
 * Auth and CREATE gate stay outside the cache; the list body is shared-server-cached.
 */
export async function listEligibleWorkshopsForInstructorScheduleForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerScheduleWorkshopTab[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  const canCreate = await hasPermission(
    adminClient,
    actorUserId ?? "",
    PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE
  );

  if (!canCreate) {
    return [];
  }

  return listEligibleWorkshopsForScheduleCached();
}

export type ListInstructorScheduleSlotsPageOptions = {
  page?: number;
  pageSize?: number;
  entityType?: string;
  type?: string;
  search?: string;
};

function resolveLockedWorkshopIds(
  workshops: Array<{ id: string; status: string }>
): string[] {
  return workshops
    .filter((row) => isWorkshopContentMutationLocked(row.status))
    .map((row) => row.id);
}

export async function getInstructorScheduleSlotsDetailsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  options: ListInstructorScheduleSlotsPageOptions = {}
): Promise<ManagerInstructorScheduleSlotsDetailsData> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  const [instructors, workshopsResult] = await Promise.all([
    listScheduleInstructorTabsCached(),
    workshopRepository.listWorkshopsForScheduleTabs(adminClient),
  ]);

  if (workshopsResult.error) {
    throw new Error(workshopsResult.error.message);
  }

  const lockedWorkshopIds = resolveLockedWorkshopIds(
    workshopsResult.data ?? []
  );

  const [slotsResult, statsResult] = await Promise.all([
    instructorScheduleSlotRepository.listInstructorScheduleSlotsPage(
      adminClient,
      {
        offset,
        limit: pageSize,
        entityType:
          options.entityType && options.entityType !== "all"
            ? options.entityType
            : undefined,
        type:
          options.type && options.type !== "all" ? options.type : undefined,
        search: options.search,
        excludeWorkshopRecordIds: lockedWorkshopIds,
      }
    ),
    instructorScheduleSlotRepository.countInstructorScheduleSlotStats(
      adminClient,
      lockedWorkshopIds
    ),
  ]);

  if (slotsResult.error) {
    throw new Error(slotsResult.error.message);
  }
  if (statsResult.error) {
    throw new Error(statsResult.error.message);
  }

  const workshops: ManagerScheduleWorkshopTab[] = (
    workshopsResult.data ?? []
  ).map((row) => {
    const status = isWorkshopStatus(row.status)
      ? row.status
      : WORKSHOP_STATUSES.DRAFT;
    return {
      id: row.id,
      name: row.name,
      start_date: row.start_date ? formatDateOnly(row.start_date) : null,
      end_date: row.end_date ? formatDateOnly(row.end_date) : null,
      status,
      eligible_for_create: isWorkshopEligibleForScheduleCreate({
        status: row.status,
        end_date: row.end_date,
      }),
    };
  });

  const sessions = (slotsResult.data ?? []).map((record) =>
    mapSlotRecordToSession(record as InstructorScheduleSlotRecord)
  );

  return {
    instructors,
    workshops,
    sessions,
    stats: statsResult.data!,
    totalCount: slotsResult.count ?? sessions.length,
    page,
    pageSize,
  };
}

export async function listInstructorScheduleSlotsPageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  options: ListInstructorScheduleSlotsPageOptions = {}
): Promise<{
  sessions: ManagerInstructorScheduleSession[];
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  const lockedWorkshopIds = await resolveLockedWorkshopIdsFromDb(adminClient);

  const slotsResult =
    await instructorScheduleSlotRepository.listInstructorScheduleSlotsPage(
      adminClient,
      {
        offset,
        limit: pageSize,
        entityType:
          options.entityType && options.entityType !== "all"
            ? options.entityType
            : undefined,
        type: options.type && options.type !== "all" ? options.type : undefined,
        search: options.search,
        excludeWorkshopRecordIds: lockedWorkshopIds,
      }
    );

  if (slotsResult.error) {
    throw new Error(slotsResult.error.message);
  }

  const sessions = (slotsResult.data ?? []).map((record) =>
    mapSlotRecordToSession(record as InstructorScheduleSlotRecord)
  );

  return {
    sessions,
    totalCount: slotsResult.count ?? sessions.length,
    page,
    pageSize,
  };
}

export async function createInstructorScheduleSlotForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    entity_type: string;
    record_id: string;
    name: string;
    type?: string;
    slot_date?: string;
    start_time: string;
    end_time: string;
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

  const parsed = createInstructorScheduleSlotSchema.safeParse({
    entity_type: input.entity_type,
    record_id: input.record_id,
    name: input.name,
    slot_date: input.slot_date?.trim() ? input.slot_date : undefined,
    start_time: input.start_time,
    end_time: input.end_time,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { entity_type, record_id, name, start_time, end_time } = parsed.data;
  const type = resolveInstructorScheduleSlotType({ entityType: entity_type });
  const slot_date = parsed.data.slot_date ?? todayIsoDate();
  const day_of_week = dayOfWeekFromIsoDate(slot_date);

  const [entityError, existingForEntity] = await Promise.all([
    assertScheduleEntityRecord(
      adminClient,
      parsed.data.entity_type,
      parsed.data.record_id,
      { requireEligibleForCreate: true }
    ),
    instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord(
      adminClient,
      entity_type,
      record_id
    ),
  ]);
  if (entityError) {
    return { success: false, error: entityError };
  }
  if (existingForEntity.error) {
    return {
      success: false,
      error: "Unable to create schedule slot. Please try again.",
    };
  }
  const overlap = findOverlappingScheduleSlot(
    (existingForEntity.data ?? []) as InstructorScheduleSlotRecord[],
    { day_of_week, start_time, end_time }
  );
  if (overlap) {
    return { success: false, error: SCHEDULE_SLOT_OVERLAP_MESSAGE };
  }

  const { data, error } =
    await instructorScheduleSlotRepository.createInstructorScheduleSlot(
      adminClient,
      {
        entity_type,
        record_id,
        name: name.trim(),
        type,
        slot_date,
        day_of_week,
        start_time,
        end_time,
      }
    );

  if (error || !data) {
    return {
      success: false,
      error: mapMutationError(error?.message ?? "Unknown error"),
    };
  }

  const created = data as InstructorScheduleSlotRecord;

  if (created.entity_type === ENTITY_SCHEDULE_TYPE_WORKSHOP) {
    const mirrorResult = await mirrorWorkshopSlotToAllInstructors(
      adminClient,
      created
    );
    if (mirrorResult.error) {
      await instructorScheduleSlotRepository.deleteInstructorScheduleSlotById(
        adminClient,
        created.id
      );
      return {
        success: false,
        error: mirrorResult.error,
      };
    }
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "instructor_schedule_slots",
    record_id: created.id,
    new_data: {
      entity_type: created.entity_type,
      record_id: created.record_id,
      name: created.name,
      type: created.type,
      slot_date: created.slot_date,
      day_of_week: created.day_of_week,
      start_time: created.start_time,
      end_time: created.end_time,
    },
    metadata: { note: "Schedule slot created." },
  });

  return {
    success: true,
    session: mapSlotRecordToSession(created),
    message: "Schedule slot created.",
  };
}

export async function updateInstructorScheduleSlotForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    entity_type: string;
    record_id: string;
    name: string;
    type: string;
    slot_date: string;
    start_time: string;
    end_time: string;
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

  if (!isScheduleEntityType(existingSlot.data.entity_type)) {
    return { success: false, error: "Schedule slot not found." };
  }

  if (existingSlot.data.source_workshop_id) {
    return {
      success: false,
      error:
        "This slot is mirrored from a workshop schedule and cannot be edited here.",
    };
  }

  // Keep entity_type + record_id immutable after create.
  const entity_type = existingSlot.data.entity_type;
  const record_id = existingSlot.data.record_id;

  const { id, name, slot_date, start_time, end_time } = parsed.data;
  const type = resolveInstructorScheduleSlotType({
    entityType: entity_type,
    sourceWorkshopId: existingSlot.data.source_workshop_id,
  });

  const preservedSlotDate = formatDateOnly(existingSlot.data.slot_date);
  const day_of_week = dayOfWeekFromIsoDate(slot_date);

  const [workshopError, existingForEntity] = await Promise.all([
    entity_type === ENTITY_SCHEDULE_TYPE_WORKSHOP
      ? assertWorkshopRecordForSchedule(adminClient, record_id, {
          requireMutableContent: true,
        })
      : Promise.resolve(null),
    instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord(
      adminClient,
      entity_type,
      record_id
    ),
  ]);
  if (workshopError) {
    return { success: false, error: workshopError };
  }
  if (existingForEntity.error) {
    return {
      success: false,
      error: "Unable to update schedule slot. Please try again.",
    };
  }
  const overlap = findOverlappingScheduleSlot(
    (existingForEntity.data ?? []) as InstructorScheduleSlotRecord[],
    { day_of_week, start_time, end_time },
    { excludeId: id }
  );
  if (overlap) {
    return { success: false, error: SCHEDULE_SLOT_OVERLAP_MESSAGE };
  }

  const { data, error } =
    await instructorScheduleSlotRepository.updateInstructorScheduleSlot(
      adminClient,
      id,
      {
        entity_type,
        record_id,
        name: name.trim(),
        type,
        slot_date: preservedSlotDate,
        day_of_week,
        start_time,
        end_time,
        source_workshop_id: existingSlot.data.source_workshop_id ?? null,
        source_slot_id: existingSlot.data.source_slot_id ?? null,
      }
    );

  if (error || !data) {
    return {
      success: false,
      error: mapMutationError(error?.message ?? "Unknown error"),
    };
  }

  const updated = data as InstructorScheduleSlotRecord;

  if (updated.entity_type === ENTITY_SCHEDULE_TYPE_WORKSHOP) {
    const mirrorResult = await updateMirrorsForWorkshopSlot(
      adminClient,
      updated
    );
    if (mirrorResult.error) {
      await instructorScheduleSlotRepository.updateInstructorScheduleSlot(
        adminClient,
        id,
        {
          entity_type: existingSlot.data.entity_type,
          record_id: existingSlot.data.record_id,
          name: existingSlot.data.name,
          type: isInstructorScheduleSlotType(existingSlot.data.type)
            ? existingSlot.data.type
            : "busy",
          slot_date: formatDateOnly(existingSlot.data.slot_date),
          day_of_week: existingSlot.data.day_of_week,
          start_time: formatTimeForDisplay(existingSlot.data.start_time),
          end_time: formatTimeForDisplay(existingSlot.data.end_time),
          source_workshop_id: existingSlot.data.source_workshop_id ?? null,
          source_slot_id: existingSlot.data.source_slot_id ?? null,
        }
      );
      return {
        success: false,
        error: mirrorResult.error,
      };
    }
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "instructor_schedule_slots",
    record_id: updated.id,
    old_data: {
      entity_type: existingSlot.data.entity_type,
      record_id: existingSlot.data.record_id,
      name: existingSlot.data.name,
      type: existingSlot.data.type,
      slot_date: existingSlot.data.slot_date,
      day_of_week: existingSlot.data.day_of_week,
      start_time: existingSlot.data.start_time,
      end_time: existingSlot.data.end_time,
    },
    new_data: {
      entity_type: updated.entity_type,
      record_id: updated.record_id,
      name: updated.name,
      type: updated.type,
      slot_date: updated.slot_date,
      day_of_week: updated.day_of_week,
      start_time: updated.start_time,
      end_time: updated.end_time,
    },
    metadata: {
      note: "Schedule slot updated.",
      changed_fields: [
        "name",
        "type",
        "day_of_week",
        "start_time",
        "end_time",
      ],
    },
  });

  return {
    success: true,
    session: mapSlotRecordToSession(updated),
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

  if (!isScheduleEntityType(existingSlot.data.entity_type)) {
    return { success: false, error: "Schedule slot not found." };
  }

  if (existingSlot.data.source_workshop_id) {
    return {
      success: false,
      error:
        "This slot is mirrored from a workshop schedule and cannot be deleted here.",
    };
  }

  const deletingWorkshopEntity =
    existingSlot.data.entity_type === ENTITY_SCHEDULE_TYPE_WORKSHOP;

  if (deletingWorkshopEntity) {
    const workshopError = await assertWorkshopRecordForSchedule(
      adminClient,
      existingSlot.data.record_id,
      { requireMutableContent: true }
    );
    if (workshopError) {
      return { success: false, error: workshopError };
    }

    const mirrorResult = await deleteMirrorsForWorkshopSlot(
      adminClient,
      slotId
    );
    if (mirrorResult.error) {
      return {
        success: false,
        error: mirrorResult.error,
      };
    }
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
      day_of_week: existingSlot.data.day_of_week,
      start_time: existingSlot.data.start_time,
      end_time: existingSlot.data.end_time,
    },
    metadata: { note: "Schedule slot deleted." },
  });

  return { success: true, message: "Schedule slot deleted." };
}
