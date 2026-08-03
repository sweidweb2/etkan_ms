"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getInstructorWorkshopDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseCreateWorkshopSessionFormData,
  parseDeleteWorkshopSessionFormData,
  parseUpdateWorkshopSessionFormData,
} from "@/lib/validators/manager/workshop-session";
import {
  createWorkshopSessionForInstructor,
  deleteWorkshopSessionForInstructor,
  updateWorkshopSessionForInstructor,
} from "@/services/instructor-workshop.service";
import type {
  CreateWorkshopSessionActionState,
  DeleteWorkshopSessionActionState,
  UpdateWorkshopSessionActionState,
} from "@/types/manager-workshop";

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
  const result = await createWorkshopSessionForInstructor(
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

  revalidatePath(ROUTES.INSTRUCTOR_WORKSHOPS);
  revalidatePath(getInstructorWorkshopDetailRoute(result.session.workshop_id));

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
  const result = await updateWorkshopSessionForInstructor(
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

  revalidatePath(ROUTES.INSTRUCTOR_WORKSHOPS);
  revalidatePath(getInstructorWorkshopDetailRoute(result.session.workshop_id));

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
  const result = await deleteWorkshopSessionForInstructor(
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

  revalidatePath(ROUTES.INSTRUCTOR_WORKSHOPS);
  revalidatePath(getInstructorWorkshopDetailRoute(parsed.data.workshop_id));

  return {
    success: true,
    message: result.message,
  };
}
