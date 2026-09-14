"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  runManagerAction,
  runManagerMutation,
} from "@/lib/actions/run-manager-action";
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
  return runManagerAction({
    formData,
    parse: parseCreateWorkshopFormData,
    mutate: ({ adminClient, actor, data }) =>
      createWorkshopForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidateManagerScheduleCalendar();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      workshop: result.workshop,
    }),
  });
}

export async function updateWorkshopAction(
  _prevState: UpdateWorkshopActionState,
  formData: FormData
): Promise<UpdateWorkshopActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateWorkshopFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateWorkshopForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(getManagerWorkshopDetailRoute(result.workshop.id));
      revalidateManagerScheduleCalendar();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      workshop: result.workshop,
    }),
  });
}

export async function updateWorkshopProposalNotesAction(
  _prevState: UpdateWorkshopActionState,
  formData: FormData
): Promise<UpdateWorkshopActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateWorkshopProposalNotesFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateWorkshopProposalNotesForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(getManagerWorkshopDetailRoute(result.workshop.id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      workshop: result.workshop,
    }),
  });
}

export async function deleteWorkshopAction(
  _prevState: DeleteWorkshopActionState,
  formData: FormData
): Promise<DeleteWorkshopActionState> {
  const workshopId = String(formData.get("workshop_id") ?? "").trim();

  if (!workshopId) {
    return {
      success: false,
      error: "Workshop not found.",
    };
  }

  return runManagerMutation({
    data: workshopId,
    mutate: ({ adminClient, actor, data }) =>
      deleteWorkshopForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidateManagerScheduleCalendar();
    },
    mapSuccess: () => {
      redirect(
        appendQueryParam(ROUTES.MANAGER_WORKSHOPS, "toast", "workshop_deleted")
      );
    },
  });
}

export async function changeWorkshopStatusAction(
  _prevState: ChangeWorkshopStatusActionState,
  formData: FormData
): Promise<ChangeWorkshopStatusActionState> {
  return runManagerAction({
    formData,
    parse: parseChangeWorkshopStatusFormData,
    mutate: ({ adminClient, actor, data }) =>
      changeWorkshopStatusForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(getManagerWorkshopDetailRoute(result.workshop.id));
      revalidateManagerScheduleCalendar();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      workshop: result.workshop,
    }),
  });
}

export async function addWorkshopInstructorAction(
  _prevState: AddWorkshopInstructorActionState,
  formData: FormData
): Promise<AddWorkshopInstructorActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateWorkshopInstructorFormData,
    mutate: ({ adminClient, actor, data }) =>
      addWorkshopInstructorForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(
        getManagerWorkshopDetailRoute(result.instructor.workshop_id)
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      instructor: result.instructor,
    }),
  });
}

export async function updateWorkshopInstructorAction(
  _prevState: UpdateWorkshopInstructorActionState,
  formData: FormData
): Promise<UpdateWorkshopInstructorActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateWorkshopInstructorFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateWorkshopInstructorForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(
        getManagerWorkshopDetailRoute(result.instructor.workshop_id)
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      instructor: result.instructor,
    }),
  });
}

export async function removeWorkshopInstructorAction(
  _prevState: RemoveWorkshopInstructorActionState,
  formData: FormData
): Promise<RemoveWorkshopInstructorActionState> {
  return runManagerAction({
    formData,
    parse: parseRemoveWorkshopInstructorFormData,
    mutate: ({ adminClient, actor, data }) =>
      removeWorkshopInstructorForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (_result, data) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(getManagerWorkshopDetailRoute(data.workshop_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function uploadWorkshopDocumentAction(
  _prevState: UploadWorkshopDocumentActionState,
  formData: FormData
): Promise<UploadWorkshopDocumentActionState> {
  return runManagerAction({
    formData,
    parse: parseUploadWorkshopDocumentFormData,
    mutate: ({ adminClient, actor, data }) =>
      uploadWorkshopDocumentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(
        getManagerWorkshopDetailRoute(result.document.workshop_id)
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      document: result.document,
    }),
  });
}

export async function renameWorkshopDocumentAction(
  _prevState: RenameWorkshopDocumentActionState,
  formData: FormData
): Promise<RenameWorkshopDocumentActionState> {
  return runManagerAction({
    formData,
    parse: parseRenameWorkshopDocumentFormData,
    mutate: ({ adminClient, actor, data }) =>
      renameWorkshopDocumentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(
        getManagerWorkshopDetailRoute(result.document.workshop_id)
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      document: result.document,
    }),
  });
}

export async function deleteWorkshopDocumentAction(
  _prevState: DeleteWorkshopDocumentActionState,
  formData: FormData
): Promise<DeleteWorkshopDocumentActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteWorkshopDocumentFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteWorkshopDocumentForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(getManagerWorkshopDetailRoute(data.workshop_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

function revalidateWorkshopPaymentPaths(workshopId: string) {
  revalidatePath(ROUTES.MANAGER_WORKSHOPS);
  revalidatePath(ROUTES.MANAGER_WORKSHOPS_PAYMENTS);
  revalidatePath(getManagerWorkshopDetailRoute(workshopId));
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT);
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS);
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_HISTORY);
}

export async function createWorkshopPaymentAction(
  _prevState: CreateWorkshopPaymentActionState,
  formData: FormData
): Promise<CreateWorkshopPaymentActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateWorkshopPaymentFormData,
    mutate: ({ adminClient, actor, data }) =>
      createWorkshopPaymentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateWorkshopPaymentPaths(result.payment.workshop_id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      payment: result.payment,
    }),
  });
}

export async function updateWorkshopPaymentAction(
  _prevState: UpdateWorkshopPaymentActionState,
  formData: FormData
): Promise<UpdateWorkshopPaymentActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateWorkshopPaymentFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateWorkshopPaymentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateWorkshopPaymentPaths(result.payment.workshop_id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      payment: result.payment,
    }),
  });
}

export async function deleteWorkshopPaymentAction(
  _prevState: DeleteWorkshopPaymentActionState,
  formData: FormData
): Promise<DeleteWorkshopPaymentActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteWorkshopPaymentFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteWorkshopPaymentForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidateWorkshopPaymentPaths(data.workshop_id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function createWorkshopSessionAction(
  _prevState: CreateWorkshopSessionActionState,
  formData: FormData
): Promise<CreateWorkshopSessionActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateWorkshopSessionFormData,
    mutate: ({ adminClient, actor, data }) =>
      createWorkshopSessionForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(getManagerWorkshopDetailRoute(result.session.workshop_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      session: result.session,
    }),
  });
}

export async function updateWorkshopSessionAction(
  _prevState: UpdateWorkshopSessionActionState,
  formData: FormData
): Promise<UpdateWorkshopSessionActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateWorkshopSessionFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateWorkshopSessionForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(getManagerWorkshopDetailRoute(result.session.workshop_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      session: result.session,
    }),
  });
}

export async function deleteWorkshopSessionAction(
  _prevState: DeleteWorkshopSessionActionState,
  formData: FormData
): Promise<DeleteWorkshopSessionActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteWorkshopSessionFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteWorkshopSessionForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(ROUTES.MANAGER_WORKSHOPS);
      revalidatePath(getManagerWorkshopDetailRoute(data.workshop_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}
