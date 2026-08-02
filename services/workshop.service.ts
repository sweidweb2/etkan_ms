import {
  WORKSHOP_STATUSES,
  WORKSHOP_STATUS_VALUES,
  type WorkshopStatusValue,
} from "@/lib/constants/manager-workshop-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { changeWorkshopStatusSchema } from "@/lib/validators/manager/change-workshop-status";
import { createWorkshopSchema } from "@/lib/validators/manager/create-workshop";
import { updateWorkshopSchema } from "@/lib/validators/manager/update-workshop";
import {
  assertWorkshopStatusTransition,
  formatLocalDateYmd,
} from "@/lib/manager/workshops/status-transitions";
import * as workshopRepository from "@/repositories/workshop.repository";
import type { WorkshopRecord } from "@/repositories/workshop.repository";
import * as workshopStorageRepository from "@/repositories/workshop-storage.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerWorkshopDetailPageData,
  ManagerWorkshopRow,
} from "@/types/manager-workshop";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateWorkshopSuccess = {
  success: true;
  workshop: ManagerWorkshopRow;
  message: string;
};

export type CreateWorkshopFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateWorkshopResult = CreateWorkshopSuccess | CreateWorkshopFailure;

export type UpdateWorkshopSuccess = {
  success: true;
  workshop: ManagerWorkshopRow;
  message: string;
};

export type UpdateWorkshopFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateWorkshopResult = UpdateWorkshopSuccess | UpdateWorkshopFailure;

export type DeleteWorkshopSuccess = {
  success: true;
  message: string;
};

export type DeleteWorkshopFailure = {
  success: false;
  error: string;
};

export type DeleteWorkshopResult = DeleteWorkshopSuccess | DeleteWorkshopFailure;

export type ChangeWorkshopStatusSuccess = {
  success: true;
  workshop: ManagerWorkshopRow;
  message: string;
};

export type ChangeWorkshopStatusFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ChangeWorkshopStatusResult =
  | ChangeWorkshopStatusSuccess
  | ChangeWorkshopStatusFailure;

export const WORKSHOP_HAS_PAYMENTS_DELETE_ERROR =
  "Remove workshop payments before deleting this workshop.";

function mapWorkshopStatus(status: string): WorkshopStatusValue {
  if (
    (WORKSHOP_STATUS_VALUES as readonly string[]).includes(status)
  ) {
    return status as WorkshopStatusValue;
  }
  return WORKSHOP_STATUSES.DRAFT;
}

function mapWorkshopRecordToRow(record: WorkshopRecord): ManagerWorkshopRow {
  return {
    id: record.id,
    name: record.name,
    subject: record.subject,
    status: mapWorkshopStatus(record.status),
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

function mapCreateWorkshopError(message: string): string {
  return message || "Unable to create workshop. Please try again.";
}

function mapUpdateWorkshopError(message: string): string {
  return message || "Unable to update workshop. Please try again.";
}

export async function listWorkshopsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerWorkshopRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.WORKSHOPS_VIEW);

  const result = await workshopRepository.listWorkshops(adminClient);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []).map(mapWorkshopRecordToRow);
}

export async function getWorkshopForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  workshopId: string
): Promise<ManagerWorkshopDetailPageData | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.WORKSHOPS_VIEW);

  const [workshopResult, paymentCountResult] = await Promise.all([
    workshopRepository.findWorkshopById(adminClient, workshopId),
    workshopRepository.countWorkshopPaymentsByWorkshopId(
      adminClient,
      workshopId
    ),
  ]);

  if (workshopResult.error) {
    throw new Error(workshopResult.error.message);
  }

  if (paymentCountResult.error) {
    throw new Error(paymentCountResult.error.message);
  }

  if (!workshopResult.data) {
    return null;
  }

  return {
    workshop: mapWorkshopRecordToRow(workshopResult.data),
    payment_count: paymentCountResult.count ?? 0,
    instructors: [],
    documents: [],
  };
}

export async function createWorkshopForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<CreateWorkshopResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createWorkshopSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const { data, error } = await workshopRepository.createWorkshop(adminClient, {
    name: dataInput.name.trim(),
    subject: dataInput.subject,
    status: WORKSHOP_STATUSES.DRAFT,
    target_audience: dataInput.target_audience,
    nb_participants: dataInput.nb_participants,
    proposal_notes: dataInput.proposal_notes,
    number_of_sessions: dataInput.number_of_sessions,
    price: dataInput.price,
    start_date: dataInput.start_date,
    end_date: dataInput.end_date,
    delivery_place: dataInput.delivery_place,
    created_by: actorUserId,
  });

  if (error || !data) {
    return {
      success: false,
      error: mapCreateWorkshopError(error?.message ?? "Unknown error"),
    };
  }

  const workshop = mapWorkshopRecordToRow(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "workshops",
    record_id: data.id,
    new_data: {
      name: workshop.name,
      subject: workshop.subject,
      status: workshop.status,
      price: workshop.price,
      start_date: workshop.start_date,
      end_date: workshop.end_date,
    },
    metadata: { note: "Workshop created." },
  });

  return {
    success: true,
    workshop,
    message: "Workshop created.",
  };
}

export async function updateWorkshopForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UpdateWorkshopResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateWorkshopSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopRepository.findWorkshopById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: mapUpdateWorkshopError(existing.error.message),
    };
  }

  if (!existing.data) {
    return { success: false, error: "Workshop not found." };
  }

  const { data, error } = await workshopRepository.updateWorkshopById(
    adminClient,
    dataInput.id,
    {
      name: dataInput.name.trim(),
      subject: dataInput.subject,
      target_audience: dataInput.target_audience,
      nb_participants: dataInput.nb_participants,
      proposal_notes: dataInput.proposal_notes,
      number_of_sessions: dataInput.number_of_sessions,
      price: dataInput.price,
      start_date: dataInput.start_date,
      end_date: dataInput.end_date,
      delivery_place: dataInput.delivery_place,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapUpdateWorkshopError(error?.message ?? "Unknown error"),
    };
  }

  const workshop = mapWorkshopRecordToRow(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshops",
    record_id: data.id,
    old_data: {
      name: existing.data.name,
      subject: existing.data.subject,
      status: existing.data.status,
      price: existing.data.price,
      start_date: existing.data.start_date,
      end_date: existing.data.end_date,
    },
    new_data: {
      name: workshop.name,
      subject: workshop.subject,
      status: workshop.status,
      price: workshop.price,
      start_date: workshop.start_date,
      end_date: workshop.end_date,
    },
    metadata: { note: "Workshop updated." },
  });

  return {
    success: true,
    workshop,
    message: "Workshop updated.",
  };
}

export async function changeWorkshopStatusForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<ChangeWorkshopStatusResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = changeWorkshopStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { id, status: nextStatus } = parsed.data;

  const existing = await workshopRepository.findWorkshopById(adminClient, id);

  if (existing.error) {
    return {
      success: false,
      error: "Unable to update workshop status. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Workshop not found." };
  }

  const currentStatus = mapWorkshopStatus(existing.data.status);
  const transition = assertWorkshopStatusTransition({
    from: currentStatus,
    to: nextStatus,
    startDate: existing.data.start_date,
    endDate: existing.data.end_date,
    today: formatLocalDateYmd(),
  });

  if (!transition.ok) {
    return { success: false, error: transition.error };
  }

  const { data, error } = await workshopRepository.updateWorkshopStatusById(
    adminClient,
    id,
    nextStatus
  );

  if (error || !data) {
    return {
      success: false,
      error: "Unable to update workshop status. Please try again.",
    };
  }

  const workshop = mapWorkshopRecordToRow(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshops",
    record_id: data.id,
    old_data: { status: currentStatus },
    new_data: { status: workshop.status },
    metadata: { note: "Workshop status changed." },
  });

  return {
    success: true,
    workshop,
    message: "Workshop status updated.",
  };
}

export async function deleteWorkshopForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  workshopId: string
): Promise<DeleteWorkshopResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existingWorkshop = await workshopRepository.findWorkshopById(
    adminClient,
    workshopId
  );

  if (existingWorkshop.error) {
    return {
      success: false,
      error: "Unable to delete workshop. Please try again.",
    };
  }

  if (!existingWorkshop.data) {
    return { success: false, error: "Workshop not found." };
  }

  const paymentCountResult =
    await workshopRepository.countWorkshopPaymentsByWorkshopId(
      adminClient,
      workshopId
    );

  if (paymentCountResult.error) {
    return {
      success: false,
      error: "Unable to delete workshop. Please try again.",
    };
  }

  if ((paymentCountResult.count ?? 0) > 0) {
    return {
      success: false,
      error: WORKSHOP_HAS_PAYMENTS_DELETE_ERROR,
    };
  }

  const documentsResult =
    await workshopRepository.listWorkshopDocumentStoragePaths(
      adminClient,
      workshopId
    );

  if (documentsResult.error) {
    return {
      success: false,
      error: "Unable to delete workshop. Please try again.",
    };
  }

  const storagePaths = (documentsResult.data ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path));

  const storageResult =
    await workshopStorageRepository.removeWorkshopStorageObjects(
      adminClient,
      storagePaths
    );

  if (storageResult.error) {
    return {
      success: false,
      error: "Unable to remove workshop documents from storage. Please try again.",
    };
  }

  const { error } = await workshopRepository.deleteWorkshopById(
    adminClient,
    workshopId
  );

  if (error) {
    return {
      success: false,
      error: "Unable to delete workshop. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "workshops",
    record_id: workshopId,
    old_data: {
      name: existingWorkshop.data.name,
      subject: existingWorkshop.data.subject,
      status: existingWorkshop.data.status,
      price: existingWorkshop.data.price,
      start_date: existingWorkshop.data.start_date,
      end_date: existingWorkshop.data.end_date,
    },
    metadata: {
      note: "Workshop hard-deleted with instructors and documents.",
      storage_objects_removed: storagePaths.length,
    },
  });

  return {
    success: true,
    message: "Workshop deleted.",
  };
}
