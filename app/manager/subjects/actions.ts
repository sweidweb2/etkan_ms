"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionAuditActor, getSessionRole } from "@/lib/auth/session";
import {
  getManagerSubjectDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateSubjectFormData } from "@/lib/validators/manager/create-subject";
import { parseUpdateSubjectFormData } from "@/lib/validators/manager/update-subject";
import {
  createSubjectForManager,
  deleteSubjectForManager,
  updateSubjectForManager,
} from "@/services/subject.service";
import type {
  CreateSubjectActionState,
  DeleteSubjectActionState,
  UpdateSubjectActionState,
} from "@/types/manager-subject";

export async function createSubjectAction(
  _prevState: CreateSubjectActionState,
  formData: FormData
): Promise<CreateSubjectActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

  const parsed = parseCreateSubjectFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createSubjectForManager(
    adminClient,
    actorRole,
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

  revalidatePath(ROUTES.MANAGER_SUBJECTS);

  return {
    success: true,
    message: result.message,
    subject: result.subject,
  };
}

export async function updateSubjectAction(
  _prevState: UpdateSubjectActionState,
  formData: FormData
): Promise<UpdateSubjectActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

  const parsed = parseUpdateSubjectFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateSubjectForManager(
    adminClient,
    actorRole,
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

  revalidatePath(ROUTES.MANAGER_SUBJECTS);
  revalidatePath(getManagerSubjectDetailRoute(result.subject.id));

  return {
    success: true,
    message: result.message,
    subject: result.subject,
  };
}

export async function deleteSubjectAction(
  _prevState: DeleteSubjectActionState,
  formData: FormData
): Promise<DeleteSubjectActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

  const subjectId = String(formData.get("subject_id") ?? "").trim();

  if (!subjectId) {
    return {
      success: false,
      error: "Subject not found.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteSubjectForManager(
    adminClient,
    actorRole,
    actor,
    subjectId
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath(ROUTES.MANAGER_SUBJECTS);
  redirect(
    appendQueryParam(ROUTES.MANAGER_SUBJECTS, "toast", "subject_deleted")
  );
}
