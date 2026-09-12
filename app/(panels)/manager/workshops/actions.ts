"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidateManagerScheduleCalendar } from "@/lib/cache/instructor-schedule-cache";
import {
  getManagerWorkshopDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseChangeWorkshopStatusFormData } from "@/lib/validators/manager/change-workshop-status";
import { parseCreateWorkshopFormData } from "@/lib/validators/manager/create-workshop";
import { parseUpdateWorkshopFormData } from "@/lib/validators/manager/update-workshop";
import { parseUpdateWorkshopProposalNotesFormData } from "@/lib/validators/manager/update-workshop-proposal-notes";
import {
  parseCreateWorkshopInstructorFormData,
  parseRemoveWorkshopInstructorFormData,
  parseUpdateWorkshopInstructorFormData,
} from "@/lib/validators/manager/workshop-instructor";
import {
  parseDeleteWorkshopDocumentFormData,
  parseRenameWorkshopDocumentFormData,
  parseUploadWorkshopDocumentFormData,
} from "@/lib/validators/manager/workshop-document";
import {
  parseCreateWorkshopPaymentFormData,
  parseDeleteWorkshopPaymentFormData,
  parseUpdateWorkshopPaymentFormData,
} from "@/lib/validators/manager/workshop-payment";
import {
  parseCreateWorkshopSessionFormData,
  parseDeleteWorkshopSessionFormData,
  parseUpdateWorkshopSessionFormData,
} from "@/lib/validators/manager/workshop-session";
import {
  addWorkshopInstructorForManager,
  changeWorkshopStatusForManager,
  createWorkshopForManager,
  createWorkshopPaymentForManager,
  createWorkshopSessionForManager,
  deleteWorkshopDocumentForManager,
  deleteWorkshopForManager,
  deleteWorkshopPaymentForManager,
  deleteWorkshopSessionForManager,
  removeWorkshopInstructorForManager,
  renameWorkshopDocumentForManager,
  updateWorkshopForManager,
  updateWorkshopInstructorForManager,
  updateWorkshopPaymentForManager,
  updateWorkshopProposalNotesForManager,
  updateWorkshopSessionForManager,
  uploadWorkshopDocumentForManager,
  listWorkshopInstructorCandidatesForManager,
  listWorkshopPaymentsForManager,
  listWorkshopScheduleSlotsForManager,
} from "@/services/workshops/workshop.service";
import type { ManagerInstructorScheduleSession } from "@/types/manager-instructor-schedule";
import type {
  AddWorkshopInstructorActionState,
  ChangeWorkshopStatusActionState,
  CreateWorkshopActionState,
  CreateWorkshopPaymentActionState,
  CreateWorkshopSessionActionState,
  DeleteWorkshopActionState,
  DeleteWorkshopDocumentActionState,
  DeleteWorkshopPaymentActionState,
  DeleteWorkshopSessionActionState,
  ManagerWorkshopInstructorCandidate,
  ManagerWorkshopPaymentRow,
  ManagerWorkshopPaymentSummary,
  RemoveWorkshopInstructorActionState,
  RenameWorkshopDocumentActionState,
  UpdateWorkshopActionState,
  UpdateWorkshopInstructorActionState,
  UpdateWorkshopPaymentActionState,
  UpdateWorkshopSessionActionState,
  UploadWorkshopDocumentActionState,
} from "@/types/manager-workshop";

export async function loadWorkshopPaymentsAction(
  workshopId: string
): Promise<{
  payments: ManagerWorkshopPaymentRow[];
  summary: ManagerWorkshopPaymentSummary;
} | null> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listWorkshopPaymentsForManager(
      adminClient,
      actor.userId,
      workshopId
    );
  } catch {
    return null;
  }
}

export async function loadWorkshopInstructorCandidatesAction(
  workshopId: string
): Promise<ManagerWorkshopInstructorCandidate[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listWorkshopInstructorCandidatesForManager(
      adminClient,
      actor.userId,
      workshopId
    );
  } catch {
    return [];
  }
}

export async function loadWorkshopScheduleSlotsAction(
  workshopId: string
): Promise<ManagerInstructorScheduleSession[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listWorkshopScheduleSlotsForManager(
      adminClient,
      actor.userId,
      workshopId
    );
  } catch {
    return [];
  }
}

export async function createWorkshopAction(
  _prevState: CreateWorkshopActionState,
  formData: FormData
): Promise<CreateWorkshopActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseCreateWorkshopFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createWorkshopForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidateManagerScheduleCalendar();

  return {
    success: true,
    message: result.message,
    workshop: result.workshop,
  };
}

export async function updateWorkshopAction(
  _prevState: UpdateWorkshopActionState,
  formData: FormData
): Promise<UpdateWorkshopActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateWorkshopFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateWorkshopForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(result.workshop.id));
  revalidateManagerScheduleCalendar();

  return {
    success: true,
    message: result.message,
    workshop: result.workshop,
  };
}

export async function updateWorkshopProposalNotesAction(
  _prevState: UpdateWorkshopActionState,
  formData: FormData
): Promise<UpdateWorkshopActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateWorkshopProposalNotesFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateWorkshopProposalNotesForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(result.workshop.id));

  return {
    success: true,
    message: result.message,
    workshop: result.workshop,
  };
}

export async function deleteWorkshopAction(
  _prevState: DeleteWorkshopActionState,
  formData: FormData
): Promise<DeleteWorkshopActionState> {
  const actor = await getSessionAuditActor();

  const workshopId = String(formData.get("workshop_id") ?? "").trim();

  if (!workshopId) {
    return {
      success: false,
      error: "Workshop not found.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteWorkshopForManager(
    adminClient,
    actor.userId,
    actor,
    workshopId
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidateManagerScheduleCalendar();
  redirect(
    appendQueryParam(ROUTES.MANAGER_WORKSHOPS, "toast", "workshop_deleted")
  );
}

export async function changeWorkshopStatusAction(
  _prevState: ChangeWorkshopStatusActionState,
  formData: FormData
): Promise<ChangeWorkshopStatusActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseChangeWorkshopStatusFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await changeWorkshopStatusForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(result.workshop.id));
  revalidateManagerScheduleCalendar();

  return {
    success: true,
    message: result.message,
    workshop: result.workshop,
  };
}

export async function addWorkshopInstructorAction(
  _prevState: AddWorkshopInstructorActionState,
  formData: FormData
): Promise<AddWorkshopInstructorActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseCreateWorkshopInstructorFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await addWorkshopInstructorForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(result.instructor.workshop_id));

  return {
    success: true,
    message: result.message,
    instructor: result.instructor,
  };
}

export async function updateWorkshopInstructorAction(
  _prevState: UpdateWorkshopInstructorActionState,
  formData: FormData
): Promise<UpdateWorkshopInstructorActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateWorkshopInstructorFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateWorkshopInstructorForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(result.instructor.workshop_id));

  return {
    success: true,
    message: result.message,
    instructor: result.instructor,
  };
}

export async function removeWorkshopInstructorAction(
  _prevState: RemoveWorkshopInstructorActionState,
  formData: FormData
): Promise<RemoveWorkshopInstructorActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseRemoveWorkshopInstructorFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await removeWorkshopInstructorForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(parsed.data.workshop_id));

  return {
    success: true,
    message: result.message,
  };
}

export async function uploadWorkshopDocumentAction(
  _prevState: UploadWorkshopDocumentActionState,
  formData: FormData
): Promise<UploadWorkshopDocumentActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUploadWorkshopDocumentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await uploadWorkshopDocumentForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(result.document.workshop_id));

  return {
    success: true,
    message: result.message,
    document: result.document,
  };
}

export async function renameWorkshopDocumentAction(
  _prevState: RenameWorkshopDocumentActionState,
  formData: FormData
): Promise<RenameWorkshopDocumentActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseRenameWorkshopDocumentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await renameWorkshopDocumentForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(result.document.workshop_id));

  return {
    success: true,
    message: result.message,
    document: result.document,
  };
}

export async function deleteWorkshopDocumentAction(
  _prevState: DeleteWorkshopDocumentActionState,
  formData: FormData
): Promise<DeleteWorkshopDocumentActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseDeleteWorkshopDocumentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteWorkshopDocumentForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(parsed.data.workshop_id));

  return {
    success: true,
    message: result.message,
  };
}

export async function createWorkshopPaymentAction(
  _prevState: CreateWorkshopPaymentActionState,
  formData: FormData
): Promise<CreateWorkshopPaymentActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseCreateWorkshopPaymentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createWorkshopPaymentForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(ROUTES.MANAGER_WORKSHOPS_PAYMENTS);
  revalidatePath(getManagerWorkshopDetailRoute(result.payment.workshop_id));
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT);
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS);
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_HISTORY);

  return {
    success: true,
    message: result.message,
    payment: result.payment,
  };
}

export async function updateWorkshopPaymentAction(
  _prevState: UpdateWorkshopPaymentActionState,
  formData: FormData
): Promise<UpdateWorkshopPaymentActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateWorkshopPaymentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateWorkshopPaymentForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(ROUTES.MANAGER_WORKSHOPS_PAYMENTS);
  revalidatePath(getManagerWorkshopDetailRoute(result.payment.workshop_id));
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT);
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS);
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_HISTORY);

  return {
    success: true,
    message: result.message,
    payment: result.payment,
  };
}

export async function deleteWorkshopPaymentAction(
  _prevState: DeleteWorkshopPaymentActionState,
  formData: FormData
): Promise<DeleteWorkshopPaymentActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseDeleteWorkshopPaymentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteWorkshopPaymentForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(ROUTES.MANAGER_WORKSHOPS_PAYMENTS);
  revalidatePath(getManagerWorkshopDetailRoute(parsed.data.workshop_id));
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT);
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS);
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_HISTORY);

  return {
    success: true,
    message: result.message,
  };
}

export async function createWorkshopSessionAction(
  _prevState: CreateWorkshopSessionActionState,
  formData: FormData
): Promise<CreateWorkshopSessionActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseCreateWorkshopSessionFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createWorkshopSessionForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(result.session.workshop_id));

  return {
    success: true,
    message: result.message,
    session: result.session,
  };
}

export async function updateWorkshopSessionAction(
  _prevState: UpdateWorkshopSessionActionState,
  formData: FormData
): Promise<UpdateWorkshopSessionActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateWorkshopSessionFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateWorkshopSessionForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(result.session.workshop_id));

  return {
    success: true,
    message: result.message,
    session: result.session,
  };
}

export async function deleteWorkshopSessionAction(
  _prevState: DeleteWorkshopSessionActionState,
  formData: FormData
): Promise<DeleteWorkshopSessionActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseDeleteWorkshopSessionFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteWorkshopSessionForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(getManagerWorkshopDetailRoute(parsed.data.workshop_id));

  return {
    success: true,
    message: result.message,
  };
}
