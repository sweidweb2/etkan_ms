"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionAuditActor } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreatePublicProjectFormData } from "@/lib/validators/manager/create-public-project";
import { parseUpdatePublicProjectFormData } from "@/lib/validators/manager/update-public-project";
import {
  createPublicProjectForManager,
  deletePublicProjectForManager,
  updatePublicProjectForManager,
} from "@/services/public/public-project.service";
import type {
  CreatePublicProjectActionState,
  DeletePublicProjectActionState,
  UpdatePublicProjectActionState,
} from "@/types/manager-public-project";

export async function createPublicProjectAction(
  _prevState: CreatePublicProjectActionState,
  formData: FormData
): Promise<CreatePublicProjectActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreatePublicProjectFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createPublicProjectForManager(
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

  return {
    success: true,
    message: result.message,
    project: result.project,
  };
}

export async function updatePublicProjectAction(
  _prevState: UpdatePublicProjectActionState,
  formData: FormData
): Promise<UpdatePublicProjectActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdatePublicProjectFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updatePublicProjectForManager(
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

  return {
    success: true,
    message: result.message,
    project: result.project,
  };
}

export async function deletePublicProjectAction(
  _prevState: DeletePublicProjectActionState,
  formData: FormData
): Promise<DeletePublicProjectActionState> {
  const actor = await getSessionAuditActor();
  const projectId = String(formData.get("id") ?? "").trim();

  if (!projectId) {
    return {
      success: false,
      error: "Project not found.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deletePublicProjectForManager(
    adminClient,
    actor.userId,
    actor,
    projectId
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath(ROUTES.MANAGER_PROJECTS);
  redirect(
    appendQueryParam(ROUTES.MANAGER_PROJECTS, "toast", "project_deleted")
  );
}
