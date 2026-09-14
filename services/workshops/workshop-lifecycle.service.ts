import { WORKSHOP_STATUSES } from "@/lib/constants/manager-workshop-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  deleteAllMirrorsForWorkshop,
  deleteAllWorkshopEntitySlots,
  recopyAllMirrorsForWorkshop,
} from "@/lib/manager/workshops/mirror-instructor-schedule";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { changeWorkshopStatusSchema } from "@/lib/validators/manager/change-workshop-status";
import { createWorkshopSchema } from "@/lib/validators/manager/create-workshop";
import { updateWorkshopSchema } from "@/lib/validators/manager/update-workshop";
import { updateWorkshopProposalNotesSchema } from "@/lib/validators/manager/update-workshop-proposal-notes";
import {
  assertWorkshopStatusTransition,
  formatLocalDateYmd,
} from "@/lib/manager/workshops/status-transitions";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as workshopStorageRepository from "@/repositories/workshop-storage.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  mapCreateWorkshopError,
  mapUpdateWorkshopError,
  mapWorkshopRecordToRow,
  mapWorkshopStatus,
  WORKSHOP_HAS_PAYMENTS_DELETE_ERROR,
  type ChangeWorkshopStatusResult,
  type CreateWorkshopResult,
  type DeleteWorkshopResult,
  type Supabase,
  type UpdateWorkshopResult,
} from "@/services/workshops/workshop-shared";

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
    type: dataInput.type,
    phone: dataInput.phone,
    target_audience: dataInput.target_audience,
    nb_participants: dataInput.nb_participants,
    proposal_notes: dataInput.proposal_notes,
    number_of_sessions: 0,
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
      type: workshop.type,
      phone: workshop.phone,
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
      type: dataInput.type,
      phone: dataInput.phone,
      target_audience: dataInput.target_audience,
      nb_participants: dataInput.nb_participants,
      proposal_notes: dataInput.proposal_notes,
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
      type: existing.data.type,
      phone: existing.data.phone,
      price: existing.data.price,
      start_date: existing.data.start_date,
      end_date: existing.data.end_date,
    },
    new_data: {
      name: workshop.name,
      subject: workshop.subject,
      status: workshop.status,
      type: workshop.type,
      phone: workshop.phone,
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

export async function updateWorkshopProposalNotesForManager(
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

  const parsed = updateWorkshopProposalNotesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { id, proposal_notes } = parsed.data;

  const existing = await workshopRepository.findWorkshopById(adminClient, id);

  if (existing.error) {
    return {
      success: false,
      error: mapUpdateWorkshopError(existing.error.message),
    };
  }

  if (!existing.data) {
    return { success: false, error: "Workshop not found." };
  }

  const { data, error } =
    await workshopRepository.updateWorkshopProposalNotesById(
      adminClient,
      id,
      proposal_notes
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
      proposal_notes: existing.data.proposal_notes,
    },
    new_data: {
      proposal_notes: workshop.proposal_notes,
    },
    metadata: { note: "Workshop proposal notes updated." },
  });

  return {
    success: true,
    workshop,
    message: "Proposal notes saved.",
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
    PERMISSIONS.WORKSHOPS_CHANGE_STATUS
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

  const isTerminalStatus =
    nextStatus === WORKSHOP_STATUSES.CANCELLED ||
    nextStatus === WORKSHOP_STATUSES.COMPLETED;

  if (isTerminalStatus) {
    const mirrorClear = await deleteAllMirrorsForWorkshop(adminClient, id);
    if (mirrorClear.error) {
      return {
        success: false,
        error: mirrorClear.error,
      };
    }

    const shouldStampEndDate =
      nextStatus === WORKSHOP_STATUSES.COMPLETED &&
      (existing.data.end_date == null || existing.data.end_date === "");
    const stampedEndDate = shouldStampEndDate
      ? formatLocalDateYmd()
      : undefined;

    const { data, error } = await workshopRepository.updateWorkshopStatusById(
      adminClient,
      id,
      nextStatus,
      stampedEndDate !== undefined ? { end_date: stampedEndDate } : undefined
    );

    if (error || !data) {
      await recopyAllMirrorsForWorkshop(adminClient, id);
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
      old_data: {
        status: currentStatus,
        ...(shouldStampEndDate ? { end_date: existing.data.end_date } : {}),
      },
      new_data: {
        status: workshop.status,
        ...(shouldStampEndDate ? { end_date: workshop.end_date } : {}),
      },
      metadata: {
        note: shouldStampEndDate
          ? "Workshop status changed; end date set to today."
          : "Workshop status changed.",
      },
    });

    return {
      success: true,
      workshop,
      message: "Workshop status updated.",
    };
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

  const reopeningFromCancelled =
    currentStatus === WORKSHOP_STATUSES.CANCELLED;

  if (reopeningFromCancelled) {
    const mirrorSync = await recopyAllMirrorsForWorkshop(adminClient, id);
    if (mirrorSync.error) {
      await workshopRepository.updateWorkshopStatusById(
        adminClient,
        id,
        currentStatus
      );
      return {
        success: false,
        error: mirrorSync.error,
      };
    }
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

  const [paymentCountResult, documentsResult] = await Promise.all([
    workshopRepository.countWorkshopPaymentsByWorkshopId(adminClient, workshopId),
    workshopRepository.listWorkshopDocumentStoragePaths(adminClient, workshopId),
  ]);

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

  const mirrorClear = await deleteAllMirrorsForWorkshop(adminClient, workshopId);
  if (mirrorClear.error) {
    return {
      success: false,
      error: mirrorClear.error,
    };
  }

  const workshopSlotsClear = await deleteAllWorkshopEntitySlots(
    adminClient,
    workshopId
  );
  if (workshopSlotsClear.error) {
    return {
      success: false,
      error: workshopSlotsClear.error,
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
