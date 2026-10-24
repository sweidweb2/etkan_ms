import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  createWorkshopSessionSchema,
  deleteWorkshopSessionSchema,
  updateWorkshopSessionSchema,
} from "@/lib/validators/manager/workshop-session";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as workshopSessionRepository from "@/repositories/workshop-session.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  contentLockErrorForWorkshopStatus,
  mapWorkshopSessionRecord,
  syncWorkshopSessionCount,
  type DeleteWorkshopSessionResult,
  type Supabase,
  type WorkshopSessionMutationResult,
} from "@/services/workshops/workshop-shared";

export async function createWorkshopSessionForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopSessionMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_SESSIONS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
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
  const nbHours = dataInput.nb_hours;

  const needsAutoOrder = dataInput.nb_order == null;
  const [workshopResult, maxOrderResult] = await Promise.all([
    workshopRepository.findWorkshopById(adminClient, dataInput.workshop_id),
    needsAutoOrder
      ? workshopSessionRepository.getMaxWorkshopSessionOrder(
          adminClient,
          dataInput.workshop_id
        )
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to create session.",
    };
  }

  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }

  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  let nbOrder = dataInput.nb_order;
  if (nbOrder == null) {
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
      nb_hours: nbHours,
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
      error: mapWorkshopSessionError(error?.message ?? "Unable to create session."),
    };
  }

  const syncError = await syncWorkshopSessionCount(
    adminClient,
    dataInput.workshop_id,
    1
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
      session_date: session.session_date,
      topic: session.topic,
      status: session.status,
    },
    metadata: { note: "Workshop session created." },
  });

  return {
    success: true,
    session,
    message: "Session created.",
  };
}

export async function updateWorkshopSessionForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopSessionMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_SESSIONS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
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
  const nbHours = dataInput.nb_hours;

  const existing = await workshopSessionRepository.findWorkshopSessionById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to update session.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Session not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Session not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to update session.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
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
        nb_hours: nbHours,
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
      error: mapWorkshopSessionError(error?.message ?? "Unable to update session."),
    };
  }

  const session = mapWorkshopSessionRecord(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshop_sessions",
    record_id: session.id,
    old_data: {
      nb_order: existing.data.nb_order,
      session_date: existing.data.session_date,
      topic: existing.data.topic,
      status: existing.data.status,
    },
    new_data: {
      nb_order: session.nb_order,
      session_date: session.session_date,
      topic: session.topic,
      status: session.status,
    },
    metadata: { note: "Workshop session updated." },
  });

  return {
    success: true,
    session,
    message: "Session updated.",
  };
}

export async function deleteWorkshopSessionForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<DeleteWorkshopSessionResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_SESSIONS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteWorkshopSessionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopSessionRepository.findWorkshopSessionById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to delete session.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Session not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Session not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to delete session.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const previous = mapWorkshopSessionRecord(existing.data);

  const { error } = await workshopSessionRepository.deleteWorkshopSessionById(
    adminClient,
    dataInput.id
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to delete session.",
    };
  }

  const syncError = await syncWorkshopSessionCount(
    adminClient,
    dataInput.workshop_id,
    -1
  );
  if (syncError) {
    return { success: false, error: syncError };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "workshop_sessions",
    record_id: dataInput.id,
    old_data: {
      workshop_id: previous.workshop_id,
      nb_order: previous.nb_order,
      session_date: previous.session_date,
      topic: previous.topic,
      status: previous.status,
    },
    metadata: { note: "Workshop session deleted." },
  });

  return {
    success: true,
    message: "Session deleted.",
  };
}

function mapWorkshopSessionError(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("workshop_sessions_workshop_nb_order_key") ||
    normalized.includes("duplicate key")
  ) {
    return "A session with this order already exists for this workshop.";
  }
  if (normalized.includes("workshop_sessions_end_after_start")) {
    return "End time must be after start time.";
  }
  return message || "Unable to save session.";
}
