"use server";

import {
  runManagerAction,
  runManagerMutation,
} from "@/lib/actions/run-manager-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getManagerSubjectDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { parseCreateSubjectFormData } from "@/lib/validators/manager/create-subject";
import { parseUpdateSubjectFormData } from "@/lib/validators/manager/update-subject";
import {
  createSubjectForManager,
  deleteSubjectForManager,
  updateSubjectForManager,
} from "@/services/classes/subject.service";
import type {
  CreateSubjectActionState,
  DeleteSubjectActionState,
  UpdateSubjectActionState,
} from "@/types/manager-subject";

export async function createSubjectAction(
  _prevState: CreateSubjectActionState,
  formData: FormData
): Promise<CreateSubjectActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateSubjectFormData,
    mutate: ({ adminClient, actor, data }) =>
      createSubjectForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_SUBJECTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      subject: result.subject,
    }),
  });
}

export async function updateSubjectAction(
  _prevState: UpdateSubjectActionState,
  formData: FormData
): Promise<UpdateSubjectActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateSubjectFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateSubjectForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(ROUTES.MANAGER_SUBJECTS);
      revalidatePath(getManagerSubjectDetailRoute(result.subject.id));
      if (result.nbSessionsChanged) {
        revalidatePath(ROUTES.MANAGER_CLASSES);
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      subject: result.subject,
    }),
  });
}

export async function deleteSubjectAction(
  _prevState: DeleteSubjectActionState,
  formData: FormData
): Promise<DeleteSubjectActionState> {
  const subjectId = String(formData.get("subject_id") ?? "").trim();

  if (!subjectId) {
    return {
      success: false,
      error: "Subject not found.",
    };
  }

  return runManagerMutation({
    data: subjectId,
    mutate: ({ adminClient, actor, data }) =>
      deleteSubjectForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_SUBJECTS);
    },
    mapSuccess: () => {
      redirect(
        appendQueryParam(ROUTES.MANAGER_SUBJECTS, "toast", "subject_deleted")
      );
    },
  });
}
