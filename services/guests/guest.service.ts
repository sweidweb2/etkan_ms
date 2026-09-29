import {
  GUEST_CURRENT_STATUSES,
  GUEST_EDUCATION_LEVEL_VALUES,
  GUEST_INTERESTED_SERVICE_VALUES,
  GUEST_PIPELINE_STATUS_VALUES,
  GUEST_PIPELINE_STATUSES,
  GUEST_REFERRED_FROM_VALUES,
  canMutateGuestPipeline,
  canRemoveGuestPipelineStatus,
  isGuestCurrentStatus,
  isGuestStatus,
  type GuestCurrentStatus,
  type GuestEducationLevel,
  type GuestInterestedService,
  type GuestReferredFrom,
  type GuestStatus,
} from "@/lib/constants/guest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import { createGuestSchema } from "@/lib/validators/manager/create-guest";
import { changeGuestStatusSchema } from "@/lib/validators/manager/change-guest-status";
import { recordGuestStatusesSchema } from "@/lib/validators/manager/record-guest-statuses";
import { removeGuestStatusSchema } from "@/lib/validators/manager/remove-guest-status";
import { setGuestProfileStatusSchema } from "@/lib/validators/manager/set-guest-profile-status";
import { updateGuestSchema } from "@/lib/validators/manager/update-guest";
import * as guestRepository from "@/repositories/guest.repository";
import type { GuestRecord } from "@/repositories/guest.repository";
import * as guestStatusEventRepository from "@/repositories/guest-status-event.repository";
import type { GuestStatusEventRecord } from "@/repositories/guest-status-event.repository";
import * as inviteRepository from "@/repositories/guest-registration-invite.repository";
import * as registrationRepository from "@/repositories/student-registration-application.repository";
import * as documentRepository from "@/repositories/student-registration-document.repository";
import * as registrationStorage from "@/repositories/registration-storage.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { releaseGuestFromTeamIfBecameClosed } from "@/services/teams/team.service";
import { attachGuestRegistrationEmails } from "@/services/guests/attach-guest-registration-emails";
import { getGuestRegistrationInviteBundleForManager } from "@/services/guests/guest-registration.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerGuestDetail,
  ManagerGuestRow,
  ManagerGuestStatusEventRow,
} from "@/types/manager-guest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateGuestSuccess = {
  success: true;
  guest: ManagerGuestRow;
  message: string;
};

export type CreateGuestFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateGuestResult = CreateGuestSuccess | CreateGuestFailure;

export type UpdateGuestSuccess = {
  success: true;
  guest: ManagerGuestRow;
  message: string;
};

export type UpdateGuestFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateGuestResult = UpdateGuestSuccess | UpdateGuestFailure;

export type DeleteGuestSuccess = {
  success: true;
  message: string;
};

export type DeleteGuestFailure = {
  success: false;
  error: string;
};

export type DeleteGuestResult = DeleteGuestSuccess | DeleteGuestFailure;

export type ChangeGuestStatusSuccess = {
  success: true;
  guest: ManagerGuestRow;
  message: string;
  statusEvents: ManagerGuestStatusEventRow[];
};

export type ChangeGuestStatusFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ChangeGuestStatusResult =
  | ChangeGuestStatusSuccess
  | ChangeGuestStatusFailure;

export type RemoveGuestStatusSuccess = {
  success: true;
  guest: ManagerGuestRow;
  message: string;
  statusEvents: ManagerGuestStatusEventRow[];
  removedStatus: GuestStatus;
};

export type RemoveGuestStatusFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type RemoveGuestStatusResult =
  | RemoveGuestStatusSuccess
  | RemoveGuestStatusFailure;

export type SetGuestProfileStatusSuccess = {
  success: true;
  guest: ManagerGuestRow;
  message: string;
};

export type SetGuestProfileStatusFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type SetGuestProfileStatusResult =
  | SetGuestProfileStatusSuccess
  | SetGuestProfileStatusFailure;

const PIPELINE_ADD_LOCKED_MESSAGE =
  "Pipeline statuses can only be recorded while the guest is pending.";
const PIPELINE_REMOVE_LOCKED_MESSAGE =
  "Pipeline statuses can only be removed while the guest is pending or finished.";

function isGuestEducationLevel(value: string): value is GuestEducationLevel {
  return (GUEST_EDUCATION_LEVEL_VALUES as readonly string[]).includes(value);
}

function isGuestInterestedService(
  value: string
): value is GuestInterestedService {
  return (GUEST_INTERESTED_SERVICE_VALUES as readonly string[]).includes(value);
}

function isGuestReferredFrom(value: string): value is GuestReferredFrom {
  return (GUEST_REFERRED_FROM_VALUES as readonly string[]).includes(value);
}

function mapGuestRecordToRow(record: GuestRecord): ManagerGuestRow {
  if (
    (record.education_level != null &&
      !isGuestEducationLevel(record.education_level)) ||
    (record.interested_service != null &&
      !isGuestInterestedService(record.interested_service)) ||
    (record.referred_from != null &&
      !isGuestReferredFrom(record.referred_from)) ||
    !isGuestCurrentStatus(record.status)
  ) {
    throw new Error("Invalid guest record.");
  }

  return {
    id: record.id,
    full_name: record.full_name,
    phone: record.phone,
    email: null,
    age: record.age,
    school_or_university: record.school_or_university,
    education_level: record.education_level,
    interested_service: record.interested_service,
    referred_from: record.referred_from,
    referred_from_other: record.referred_from_other,
    status: record.status,
    notes: record.notes,
    created_by: record.created_by,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function mapGuestStatusEventRecordToRow(
  record: GuestStatusEventRecord
): ManagerGuestStatusEventRow {
  if (!isGuestStatus(record.status)) {
    throw new Error("Invalid guest status event record.");
  }

  return {
    id: record.id,
    guest_id: record.guest_id,
    status: record.status,
    note: record.note,
    created_by: record.created_by,
    created_at: record.created_at,
  };
}

function auditPayload(record: GuestRecord) {
  return {
    full_name: record.full_name,
    phone: record.phone,
    age: record.age,
    school_or_university: record.school_or_university,
    education_level: record.education_level,
    interested_service: record.interested_service,
    referred_from: record.referred_from,
    referred_from_other: record.referred_from_other,
    status: record.status,
    notes: record.notes,
  };
}

function mapCreateGuestError(message: string): string {
  return message || "Unable to create guest. Please try again.";
}

function mapUpdateGuestError(message: string): string {
  return message || "Unable to update guest. Please try again.";
}

export async function listGuestsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerGuestRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GUESTS_VIEW);

  const { data, error } = await guestRepository.listGuests(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return attachGuestRegistrationEmails(
    adminClient,
    (data ?? []).map(mapGuestRecordToRow)
  );
}

export async function getGuestForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  guestId: string
): Promise<ManagerGuestRow | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GUESTS_VIEW);

  const { data, error } = await guestRepository.findGuestById(
    adminClient,
    guestId
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [guest] = await attachGuestRegistrationEmails(adminClient, [
    mapGuestRecordToRow(data),
  ]);
  return guest ?? null;
}

export async function listGuestStatusEventsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  guestId: string
): Promise<ManagerGuestStatusEventRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GUESTS_VIEW);

  const { data, error } =
    await guestStatusEventRepository.listGuestStatusEventsByGuestId(
      adminClient,
      guestId
    );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapGuestStatusEventRecordToRow);
}

export async function getGuestDetailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  guestId: string
): Promise<ManagerGuestDetail | null> {
  const timer = createNavStepTimer("guest_detail_load");
  try {
    await timer.step("auth", () =>
      assertPermission(adminClient, actorUserId, PERMISSIONS.GUESTS_VIEW)
    );

    const [guestResult, eventsResult, registration] = await timer.step(
      "detail",
      () =>
        Promise.all([
          guestRepository.findGuestById(adminClient, guestId),
          guestStatusEventRepository.listGuestStatusEventsByGuestId(
            adminClient,
            guestId
          ),
          getGuestRegistrationInviteBundleForManager(adminClient, guestId),
        ])
    );

    if (guestResult.error) {
      throw new Error(guestResult.error.message);
    }
    if (eventsResult.error) {
      throw new Error(eventsResult.error.message);
    }
    if (!guestResult.data) {
      return null;
    }

    return {
      guest: {
        ...mapGuestRecordToRow(guestResult.data),
        email: registration.application?.email ?? null,
      },
      statusEvents: (eventsResult.data ?? []).map(mapGuestStatusEventRecordToRow),
      registrationInvite: registration.invite,
      registrationApplication: registration.application,
    };
  } finally {
    timer.end();
  }
}

function uniquePipelineStatuses(statuses: GuestStatus[]): GuestStatus[] {
  const selected = new Set(statuses);
  return GUEST_PIPELINE_STATUS_VALUES.filter((status) => selected.has(status));
}

function mergeGuestStatusEventRows(
  existing: GuestStatusEventRecord[],
  created: GuestStatusEventRecord[]
): ManagerGuestStatusEventRow[] {
  const merged = [...existing, ...created].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  return merged.map(mapGuestStatusEventRecordToRow);
}

async function finishGuestProfileFromPipeline(
  adminClient: Supabase,
  actor: AuditActor,
  guest: ManagerGuestRow
): Promise<{ guest: ManagerGuestRow; error?: string }> {
  if (guest.status === GUEST_CURRENT_STATUSES.FINISHED) {
    return { guest };
  }

  const { data, error } = await guestRepository.updateGuestStatus(
    adminClient,
    guest.id,
    GUEST_CURRENT_STATUSES.FINISHED
  );

  if (error || !data) {
    return {
      guest,
      error: error?.message || "Unable to set guest profile to finished.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "guests",
    record_id: data.id,
    old_data: { status: guest.status },
    new_data: { status: data.status },
    metadata: { note: "Guest profile set to finished from pipeline." },
  });

  await releaseGuestFromTeamIfBecameClosed(adminClient, actor, {
    guestId: guest.id,
    previousStatus: guest.status,
    nextStatus: data.status,
    guestName: data.full_name,
  });

  return { guest: mapGuestRecordToRow(data) };
}

async function reopenFinishedGuestToPending(
  adminClient: Supabase,
  actor: AuditActor,
  guest: ManagerGuestRow
): Promise<{ guest: ManagerGuestRow; error?: string }> {
  if (guest.status !== GUEST_CURRENT_STATUSES.FINISHED) {
    return { guest };
  }

  const { data, error } = await guestRepository.updateGuestStatus(
    adminClient,
    guest.id,
    GUEST_CURRENT_STATUSES.PENDING
  );

  if (error || !data) {
    return {
      guest,
      error: error?.message || "Unable to set guest profile to pending.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "guests",
    record_id: data.id,
    old_data: { status: guest.status },
    new_data: { status: data.status },
    metadata: {
      note: "Guest profile reopened to pending after pipeline status removed.",
    },
  });

  return { guest: mapGuestRecordToRow(data) };
}

export async function setGuestStatusForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    status: GuestStatus;
    note?: string | null;
  }
): Promise<ChangeGuestStatusResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_CHANGE_STATUS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = changeGuestStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, status, note } = parsed.data;

  const [existing, listedEvents] = await Promise.all([
    guestRepository.findGuestById(adminClient, id),
    guestStatusEventRepository.listGuestStatusEventsByGuestId(adminClient, id),
  ]);
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Guest not found." };
  }
  if (listedEvents.error) {
    return { success: false, error: listedEvents.error.message };
  }

  const current = mapGuestRecordToRow(existing.data);
  if (!canMutateGuestPipeline(current.status)) {
    return { success: false, error: PIPELINE_ADD_LOCKED_MESSAGE };
  }

  const existingEvents = listedEvents.data ?? [];
  if (existingEvents.some((event) => event.status === status)) {
    return {
      success: true,
      guest: current,
      message: "This status was already recorded.",
      statusEvents: existingEvents.map(mapGuestStatusEventRecordToRow),
    };
  }

  const eventResult = await guestStatusEventRepository.createGuestStatusEvent(
    adminClient,
    {
      guest_id: id,
      status,
      note,
      created_by: actor.userId,
    }
  );

  if (eventResult.error || !eventResult.data) {
    return {
      success: false,
      error: "Unable to record guest status change. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "guest_status_events",
    record_id: eventResult.data.id,
    new_data: { guest_id: id, status, note },
    metadata: { note: "Guest pipeline status recorded." },
  });

  let guest = current;
  if (status === GUEST_PIPELINE_STATUSES.FINISHED) {
    const finished = await finishGuestProfileFromPipeline(
      adminClient,
      actor,
      current
    );
    if (finished.error) {
      return { success: false, error: finished.error };
    }
    guest = finished.guest;
  }

  return {
    success: true,
    guest,
    message:
      status === GUEST_PIPELINE_STATUSES.FINISHED
        ? "Status recorded. Guest marked finished."
        : "Status recorded.",
    statusEvents: mergeGuestStatusEventRows(existingEvents, [eventResult.data]),
  };
}

export async function setGuestStatusesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    statuses: GuestStatus[];
    note?: string | null;
    finishProfileOnPipelineFinished?: boolean;
  }
): Promise<ChangeGuestStatusResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_CHANGE_STATUS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = recordGuestStatusesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, note } = parsed.data;
  const finishProfileOnPipelineFinished =
    input.finishProfileOnPipelineFinished ?? true;

  const existing = await guestRepository.findGuestById(adminClient, id);
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Guest not found." };
  }

  return recordGuestPipelineStatusesForGuest(adminClient, actor, existing.data, {
    statuses: parsed.data.statuses,
    note,
    finishProfileOnPipelineFinished,
  });
}

export async function applyGuestProfileStatusForGuestRecord(
  adminClient: Supabase,
  actor: AuditActor,
  guestRecord: GuestRecord,
  input: {
    status: GuestCurrentStatus;
    note?: string | null;
  }
): Promise<SetGuestProfileStatusResult> {
  const parsed = setGuestProfileStatusSchema.safeParse({
    id: guestRecord.id,
    status: input.status,
    note: input.note,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, status, note } = parsed.data;
  const current = mapGuestRecordToRow(guestRecord);
  if (current.status === status) {
    return {
      success: true,
      guest: current,
      message: "Already at this status.",
    };
  }

  const { data, error } = await guestRepository.updateGuestStatus(
    adminClient,
    id,
    status
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to update guest status. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "guests",
    record_id: data.id,
    old_data: { status: guestRecord.status },
    new_data: { status: data.status, note },
    metadata: { note: "Guest profile status changed." },
  });

  await releaseGuestFromTeamIfBecameClosed(adminClient, actor, {
    guestId: id,
    previousStatus: guestRecord.status,
    nextStatus: data.status,
    guestName: data.full_name,
  });

  return {
    success: true,
    guest: mapGuestRecordToRow(data),
    message: "Guest status updated.",
  };
}

export async function recordGuestPipelineStatusesForGuest(
  adminClient: Supabase,
  actor: AuditActor,
  guestRecord: GuestRecord,
  input: {
    statuses: GuestStatus[];
    note?: string | null;
    finishProfileOnPipelineFinished?: boolean;
  }
): Promise<ChangeGuestStatusResult> {
  const parsed = recordGuestStatusesSchema.safeParse({
    id: guestRecord.id,
    statuses: input.statuses,
    note: input.note,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, note } = parsed.data;
  const statuses = uniquePipelineStatuses(parsed.data.statuses);
  const finishProfileOnPipelineFinished =
    input.finishProfileOnPipelineFinished ?? true;
  const current = mapGuestRecordToRow(guestRecord);

  if (!canMutateGuestPipeline(current.status)) {
    return { success: false, error: PIPELINE_ADD_LOCKED_MESSAGE };
  }

  const listedEvents =
    await guestStatusEventRepository.listGuestStatusEventsByGuestId(
      adminClient,
      id
    );
  if (listedEvents.error) {
    return { success: false, error: listedEvents.error.message };
  }

  const existingEvents = listedEvents.data ?? [];
  const alreadyRecorded = new Set(existingEvents.map((row) => row.status));
  const toRecord = statuses.filter((status) => !alreadyRecorded.has(status));

  if (toRecord.length === 0) {
    return {
      success: true,
      guest: current,
      message: "These statuses were already recorded.",
      statusEvents: existingEvents.map(mapGuestStatusEventRecordToRow),
    };
  }

  const batchResult = await guestStatusEventRepository.createGuestStatusEvents(
    adminClient,
    toRecord.map((status) => ({
      guest_id: id,
      status,
      note,
      created_by: actor.userId,
    }))
  );

  if (batchResult.error || !batchResult.data) {
    return {
      success: false,
      error: "Unable to record guest status change. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "guest_status_events",
    record_id: id,
    new_data: { guest_id: id, statuses: toRecord, note },
    metadata: { note: "Guest pipeline statuses recorded." },
  });

  let guest = current;
  const recordedFinished = toRecord.includes(GUEST_PIPELINE_STATUSES.FINISHED);
  if (recordedFinished && finishProfileOnPipelineFinished) {
    const finished = await finishGuestProfileFromPipeline(
      adminClient,
      actor,
      current
    );
    if (finished.error) {
      return { success: false, error: finished.error };
    }
    guest = finished.guest;
  }

  return {
    success: true,
    guest,
    message:
      recordedFinished && finishProfileOnPipelineFinished
        ? "Statuses recorded. Guest marked finished."
        : toRecord.length === 1
          ? "Status recorded."
          : `${toRecord.length} statuses recorded.`,
    statusEvents: mergeGuestStatusEventRows(existingEvents, batchResult.data),
  };
}

export async function setGuestProfileStatusForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    status: GuestCurrentStatus;
    note?: string | null;
  }
): Promise<SetGuestProfileStatusResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_CHANGE_STATUS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = setGuestProfileStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id } = parsed.data;

  const existing = await guestRepository.findGuestById(adminClient, id);
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Guest not found." };
  }

  return applyGuestProfileStatusForGuestRecord(
    adminClient,
    actor,
    existing.data,
    { status: parsed.data.status, note: parsed.data.note }
  );
}

export async function removeGuestStatusForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    status: GuestStatus;
  }
): Promise<RemoveGuestStatusResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_CHANGE_STATUS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = removeGuestStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, status } = parsed.data;

  const [existing, listedEvents] = await Promise.all([
    guestRepository.findGuestById(adminClient, id),
    guestStatusEventRepository.listGuestStatusEventsByGuestId(adminClient, id),
  ]);
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Guest not found." };
  }
  if (listedEvents.error) {
    return { success: false, error: listedEvents.error.message };
  }

  const guest = mapGuestRecordToRow(existing.data);
  if (!canRemoveGuestPipelineStatus(guest.status)) {
    return { success: false, error: PIPELINE_REMOVE_LOCKED_MESSAGE };
  }

  const deleteResult =
    await guestStatusEventRepository.deleteGuestStatusEventsByGuestIdAndStatus(
      adminClient,
      id,
      status
    );
  if (deleteResult.error) {
    return {
      success: false,
      error: "Unable to remove guest status. Please try again.",
    };
  }

  const deleted = deleteResult.data ?? [];
  if (deleted.length === 0) {
    return {
      success: false,
      error: "This status is not recorded for this guest.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "info",
    table_name: "guest_status_events",
    record_id: id,
    old_data: {
      guest_id: id,
      status,
      removed_event_ids: deleted.map((event) => event.id),
    },
    new_data: null,
    metadata: { note: "Guest pipeline status removed." },
  });

  const remainingEvents = (listedEvents.data ?? []).filter(
    (event) => event.status !== status
  );

  const reopened = await reopenFinishedGuestToPending(
    adminClient,
    actor,
    guest
  );
  if (reopened.error) {
    return { success: false, error: reopened.error };
  }

  const didReopen = reopened.guest.status !== guest.status;

  return {
    success: true,
    guest: reopened.guest,
    message: didReopen
      ? "Status removed. Guest moved back to pending."
      : "Status removed from history.",
    removedStatus: status,
    statusEvents: remainingEvents.map(mapGuestStatusEventRecordToRow),
  };
}

export async function createGuestForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    full_name: string;
    phone?: string | null;
    age?: number | null;
    school_or_university?: string | null;
    education_level?: GuestEducationLevel | null;
    interested_service?: GuestInterestedService | null;
    referred_from?: GuestReferredFrom | null;
    referred_from_other?: string | null;
    status?: GuestCurrentStatus;
    notes?: string | null;
  }
): Promise<CreateGuestResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createGuestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    full_name,
    phone,
    age,
    school_or_university,
    education_level,
    interested_service,
    referred_from,
    referred_from_other,
    status,
    notes,
  } = parsed.data;

  const { data, error } = await guestRepository.createGuest(adminClient, {
    full_name,
    phone,
    age,
    school_or_university,
    education_level,
    interested_service,
    referred_from,
    referred_from_other,
    status,
    notes,
    created_by: actor.userId,
  });

  if (error || !data) {
    return {
      success: false,
      error: mapCreateGuestError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "guests",
    record_id: data.id,
    new_data: auditPayload(data),
    metadata: { note: `Guest created with ${status} status.` },
  });

  return {
    success: true,
    guest: mapGuestRecordToRow(data),
    message: "Guest created.",
  };
}

export async function updateGuestForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    full_name: string;
    phone?: string | null;
    age?: number | null;
    school_or_university?: string | null;
    education_level?: GuestEducationLevel | null;
    interested_service?: GuestInterestedService | null;
    referred_from?: GuestReferredFrom | null;
    referred_from_other?: string | null;
    notes?: string | null;
  }
): Promise<UpdateGuestResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateGuestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    id,
    full_name,
    phone,
    age,
    school_or_university,
    education_level,
    interested_service,
    referred_from,
    referred_from_other,
    notes,
  } = parsed.data;

  const existing = await guestRepository.findGuestById(adminClient, id);
  if (existing.error) {
    return {
      success: false,
      error: mapUpdateGuestError(existing.error.message),
    };
  }
  if (!existing.data) {
    return { success: false, error: "Guest not found." };
  }

  const { data, error } = await guestRepository.updateGuest(adminClient, id, {
    full_name,
    phone,
    age,
    school_or_university,
    education_level,
    interested_service,
    referred_from,
    referred_from_other,
    notes,
  });

  if (error || !data) {
    return {
      success: false,
      error: mapUpdateGuestError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "guests",
    record_id: data.id,
    old_data: auditPayload(existing.data),
    new_data: auditPayload(data),
    metadata: { note: "Guest intake updated." },
  });

  return {
    success: true,
    guest: mapGuestRecordToRow(data),
    message: "Guest updated.",
  };
}

export async function deleteGuestForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  guestId: string
): Promise<DeleteGuestResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existing = await guestRepository.findGuestById(adminClient, guestId);
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Guest not found." };
  }

  const [eventsResult, inviteResult, applicationsResult] = await Promise.all([
    guestStatusEventRepository.listGuestStatusEventsByGuestId(
      adminClient,
      guestId
    ),
    inviteRepository.findInviteByGuestId(adminClient, guestId),
    registrationRepository.listApplicationIdsByGuestId(adminClient, guestId),
  ]);

  if (eventsResult.error) {
    return { success: false, error: eventsResult.error.message };
  }

  if (inviteResult.error) {
    return { success: false, error: inviteResult.error.message };
  }

  if (applicationsResult.error) {
    return { success: false, error: applicationsResult.error.message };
  }

  const applicationIds = (applicationsResult.data ?? []).map((row) => row.id);
  const inviteApplicationId = inviteResult.data?.application_id ?? null;
  if (inviteApplicationId && !applicationIds.includes(inviteApplicationId)) {
    applicationIds.push(inviteApplicationId);
  }

  const docsResult =
    await documentRepository.listStudentRegistrationDocumentsByApplicationIds(
      adminClient,
      applicationIds
    );
  if (docsResult.error) {
    return { success: false, error: docsResult.error.message };
  }

  const storagePaths = (docsResult.data ?? []).map((doc) => doc.storage_path);
  if (storagePaths.length > 0) {
    const storageResult =
      await registrationStorage.removeRegistrationStorageObjects(
        adminClient,
        storagePaths
      );
    if (storageResult.error) {
      return {
        success: false,
        error:
          storageResult.error.message ||
          "Unable to delete registration documents. Please try again.",
      };
    }
  }

  const { error } = await guestRepository.deleteGuestById(adminClient, guestId);
  if (error) {
    return {
      success: false,
      error: error.message || "Unable to delete guest. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "guests",
    record_id: guestId,
    old_data: auditPayload(existing.data),
    metadata: {
      note: "Guest hard-deleted with related registration and status data.",
      status_event_count: (eventsResult.data ?? []).length,
      application_count: applicationIds.length,
      document_count: storagePaths.length,
      invite_id: inviteResult.data?.id ?? null,
    },
  });

  return {
    success: true,
    message: "Guest deleted.",
  };
}
