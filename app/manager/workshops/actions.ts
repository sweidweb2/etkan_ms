"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getManagerWorkshopDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateWorkshopFormData } from "@/lib/validators/manager/create-workshop";
import { parseUpdateWorkshopFormData } from "@/lib/validators/manager/update-workshop";
import {
  createWorkshopForManager,
  deleteWorkshopForManager,
  updateWorkshopForManager,
} from "@/services/workshop.service";
import type {
  CreateWorkshopActionState,
  DeleteWorkshopActionState,
  UpdateWorkshopActionState,
} from "@/types/manager-workshop";

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
  redirect(
    appendQueryParam(ROUTES.MANAGER_WORKSHOPS, "toast", "workshop_deleted")
  );
}
