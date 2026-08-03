import {
  WORKSHOP_OFFERING_TYPES,
  WORKSHOP_OFFERING_TYPE_VALUES,
  WORKSHOP_SESSION_STATUSES,
  WORKSHOP_SESSION_STATUS_VALUES,
  type WorkshopOfferingType,
  type WorkshopSessionStatus,
} from "@/lib/constants/manager-workshop-display";
import {
  WORKSHOP_STATUSES,
  WORKSHOP_STATUS_VALUES,
  type WorkshopStatusValue,
} from "@/lib/constants/manager-workshop-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  createWorkshopSessionSchema,
  updateWorkshopSessionSchema,
  deleteWorkshopSessionSchema,
} from "@/lib/validators/manager/workshop-session";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import type { WorkshopRecord } from "@/repositories/workshop.repository";
import * as workshopSessionRepository from "@/repositories/workshop-session.repository";
import type { WorkshopSessionRecord } from "@/repositories/workshop-session.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import type {
  DeleteWorkshopSessionActionState,
  ManagerWorkshopRow,
  ManagerWorkshopSessionRow,
} from "@/types/manager-workshop";
import type { FieldErrors } from "@/types/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type WorkshopSessionMutationResult =
  | {
      success: true;
      session: ManagerWorkshopSessionRow;
      message: string;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: FieldErrors;
    };

type Supabase = SupabaseClient<Database>;

export type InstructorWorkshopDetailPageData = {
  workshop: ManagerWorkshopRow;
  sessions: ManagerWorkshopSessionRow[];
  assignmentRole: string;
};

function mapWorkshopStatus(status: string): WorkshopStatusValue {
  if ((WORKSHOP_STATUS_VALUES as readonly string[]).includes(status)) {
    return status as WorkshopStatusValue;
  }
  return WORKSHOP_STATUSES.DRAFT;
}

function mapWorkshopOfferingType(type: string): WorkshopOfferingType {
  if ((WORKSHOP_OFFERING_TYPE_VALUES as readonly string[]).includes(type)) {
    return type as WorkshopOfferingType;
  }
  return WORKSHOP_OFFERING_TYPES.WORKSHOP;
}

function mapWorkshopRecordToRow(record: WorkshopRecord): ManagerWorkshopRow {
  return {
    id: record.id,
    name: record.name,
    subject: record.subject,
    status: mapWorkshopStatus(record.status),
    type: mapWorkshopOfferingType(record.type),
    phone: record.phone,
    target_audience: record.target_audience,
    nb_participants: record.nb_participants,
    proposal_notes: record.proposal_notes,
    number_of_sessions: record.number_of_sessions,
    price: record.price,
    start_date: record.start_date,
    end_date: record.end_date,
    delivery_place: record.delivery_place,
    created_by: record.created_by,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function mapWorkshopSessionStatus(status: string): WorkshopSessionStatus {
  if ((WORKSHOP_SESSION_STATUS_VALUES as readonly string[]).includes(status)) {
    return status as WorkshopSessionStatus;
  }
  return WORKSHOP_SESSION_STATUSES.PLANNED;
}

function mapWorkshopSessionRecord(
  record: WorkshopSessionRecord
): ManagerWorkshopSessionRow {
  return {
    id: record.id,
    workshop_id: record.workshop_id,
    nb_order: record.nb_order,
    session_date: record.session_date,
    start_time: record.start_time,
    end_time: record.end_time,
    nb_hours: Number(record.nb_hours),
    topic: record.topic,
    notes: record.notes,
    suggestions: record.suggestions,
    status: mapWorkshopSessionStatus(record.status),
    participants_eval: record.participants_eval,
    session_eval: record.session_eval,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

async function syncWorkshopSessionCount(
  adminClient: Supabase,
  workshopId: string
): Promise<string | null> {
  const countResult =
    await workshopSessionRepository.countWorkshopSessionsByWorkshopId(
      adminClient,
      workshopId
    );

  if (countResult.error) {
    return countResult.error.message || "Unable to sync session count.";
  }

  const { error } = await workshopRepository.updateWorkshopNumberOfSessionsById(
    adminClient,
    workshopId,
    countResult.count ?? 0
  );

  if (error) {
    return error.message || "Unable to sync session count.";
  }

  return null;
}

async function requireInstructorWorkshopMembership(
  adminClient: Supabase,
  actorUserId: string,
  workshopId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const membership =
    await workshopInstructorRepository.findWorkshopInstructorByWorkshopAndUser(
      adminClient,
      workshopId,
      actorUserId
    );

  if (membership.error) {
    return {
      ok: false,
      error: membership.error.message || "Unable to verify workshop access.",
    };
  }

  if (!membership.data) {
    return { ok: false, error: "Workshop not found." };
  }

  return { ok: true };
}

/**
 * Workshops where the actor is listed on `workshop_instructors`.
 */
export async function listWorkshopsForInstructor(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerWorkshopRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_PORTAL_WORKSHOPS_VIEW
  );

  if (!actorUserId) {
    return [];
  }

  const assignments =
    await workshopInstructorRepository.listWorkshopInstructorsByUserId(
      adminClient,
      actorUserId
    );

  if (assignments.error) {
    throw new Error(assignments.error.message);
  }

  const workshopIds = [
    ...new Set((assignments.data ?? []).map((row) => row.workshop_id)),
  ];

  const workshopsResult = await workshopRepository.listWorkshopsByIds(
    adminClient,
    workshopIds
  );

  if (workshopsResult.error) {
    throw new Error(workshopsResult.error.message);
  }

  return (workshopsResult.data ?? []).map(mapWorkshopRecordToRow);
}

export async function getWorkshopForInstructor(
  adminClient: Supabase,
  actorUserId: string | null,
  workshopId: string
): Promise<InstructorWorkshopDetailPageData | null> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_PORTAL_WORKSHOPS_VIEW
  );

  if (!actorUserId) {
    return null;
  }

  const membership =
    await workshopInstructorRepository.findWorkshopInstructorByWorkshopAndUser(
      adminClient,
      workshopId,
      actorUserId
    );

  if (membership.error) {
    throw new Error(membership.error.message);
  }

  if (!membership.data) {
    return null;
  }

  const [workshopResult, sessionsResult] = await Promise.all([
    workshopRepository.findWorkshopById(adminClient, workshopId),
    workshopSessionRepository.listWorkshopSessionsByWorkshopId(
      adminClient,
      workshopId
    ),
  ]);

  if (workshopResult.error) {
    throw new Error(workshopResult.error.message);
  }

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  if (!workshopResult.data) {
    return null;
  }

  return {
    workshop: mapWorkshopRecordToRow(workshopResult.data),
    sessions: (sessionsResult.data ?? []).map(mapWorkshopSessionRecord),
    assignmentRole: membership.data.role,
  };
}

export async function createWorkshopSessionForInstructor(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopSessionMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_PORTAL_WORKSHOPS_SESSIONS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!actorUserId) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = createWorkshopSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;
  const access = await requireInstructorWorkshopMembership(
    adminClient,
    actorUserId,
    dataInput.workshop_id
  );
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  let nbOrder = dataInput.nb_order;
  if (nbOrder == null) {
    const maxOrderResult =
      await workshopSessionRepository.getMaxWorkshopSessionOrder(
        adminClient,
        dataInput.workshop_id
      );
    if (maxOrderResult.error) {
      return {
        success: false,
        error: maxOrderResult.error.message || "Unable to create session.",
      };
    }
    nbOrder = (maxOrderResult.data?.nb_order ?? 0) + 1;
  }

  const { data, error } = await workshopSessionRepository.createWorkshopSession(
    adminClient,
    {
      workshop_id: dataInput.workshop_id,
      nb_order: nbOrder,
      session_date: dataInput.session_date,
      start_time: dataInput.start_time,
      end_time: dataInput.end_time,
      nb_hours: dataInput.nb_hours,
      topic: dataInput.topic.trim(),
      notes: dataInput.notes,
      suggestions: dataInput.suggestions,
      status: dataInput.status,
      participants_eval: dataInput.participants_eval,
      session_eval: dataInput.session_eval,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to create session.",
    };
  }

  const syncError = await syncWorkshopSessionCount(
    adminClient,
    dataInput.workshop_id
  );
  if (syncError) {
    return { success: false, error: syncError };
  }

  const session = mapWorkshopSessionRecord(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "workshop_sessions",
    record_id: session.id,
    new_data: {
      workshop_id: session.workshop_id,
      nb_order: session.nb_order,
      topic: session.topic,
      status: session.status,
    },
    metadata: { note: "Instructor created workshop session." },
  });

  return { success: true, session, message: "Session created." };
}

export async function updateWorkshopSessionForInstructor(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopSessionMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_PORTAL_WORKSHOPS_SESSIONS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!actorUserId) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = updateWorkshopSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;
  const existing = await workshopSessionRepository.findWorkshopSessionById(
    adminClient,
    dataInput.id
  );

  if (existing.error || !existing.data) {
    return { success: false, error: "Session not found." };
  }

  const access = await requireInstructorWorkshopMembership(
    adminClient,
    actorUserId,
    existing.data.workshop_id
  );
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Session not found." };
  }

  const nbOrder = dataInput.nb_order ?? existing.data.nb_order;

  const { data, error } =
    await workshopSessionRepository.updateWorkshopSessionById(
      adminClient,
      dataInput.id,
      {
        nb_order: nbOrder,
        session_date: dataInput.session_date,
        start_time: dataInput.start_time,
        end_time: dataInput.end_time,
        nb_hours: dataInput.nb_hours,
        topic: dataInput.topic.trim(),
        notes: dataInput.notes,
        suggestions: dataInput.suggestions,
        status: dataInput.status,
        participants_eval: dataInput.participants_eval,
        session_eval: dataInput.session_eval,
      }
    );

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to update session.",
    };
  }

  const syncError = await syncWorkshopSessionCount(
    adminClient,
    existing.data.workshop_id
  );
  if (syncError) {
    return { success: false, error: syncError };
  }

  const session = mapWorkshopSessionRecord(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshop_sessions",
    record_id: session.id,
    metadata: { note: "Instructor updated workshop session." },
  });

  return { success: true, session, message: "Session updated." };
}

export async function deleteWorkshopSessionForInstructor(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<DeleteWorkshopSessionActionState> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_PORTAL_WORKSHOPS_SESSIONS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!actorUserId) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = deleteWorkshopSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid session." };
  }

  const existing = await workshopSessionRepository.findWorkshopSessionById(
    adminClient,
    parsed.data.id
  );

  if (existing.error || !existing.data) {
    return { success: false, error: "Session not found." };
  }

  const access = await requireInstructorWorkshopMembership(
    adminClient,
    actorUserId,
    existing.data.workshop_id
  );
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const { error } = await workshopSessionRepository.deleteWorkshopSessionById(
    adminClient,
    parsed.data.id
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to delete session.",
    };
  }

  const syncError = await syncWorkshopSessionCount(
    adminClient,
    existing.data.workshop_id
  );
  if (syncError) {
    return { success: false, error: syncError };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "workshop_sessions",
    record_id: parsed.data.id,
    metadata: { note: "Instructor deleted workshop session." },
  });

  return { success: true, message: "Session deleted." };
}
