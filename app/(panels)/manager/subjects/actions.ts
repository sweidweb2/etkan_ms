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
import { parseCreateSubjectTaskFormData } from "@/lib/validators/manager/create-subject-task";
import { parseUpdateSubjectTaskFormData } from "@/lib/validators/manager/update-subject-task";
import {
  createSubjectForManager,
  deleteSubjectForManager,
  updateSubjectForManager,
} from "@/services/classes/subject.service";
import {
  createSubjectTaskForManager,
  deleteSubjectTaskForManager,
  updateSubjectTaskForManager,
} from "@/services/subjects/subject-tasks.service";
import type {
  CreateSubjectActionState,
  DeleteSubjectActionState,
  UpdateSubjectActionState,
} from "@/types/manager-subject";
import type {
  CreateSubjectTaskActionState,
  DeleteSubjectTaskActionState,
  UpdateSubjectTaskActionState,
} from "@/types/manager-subject-task";

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

export async function createSubjectTaskAction(
  _prevState: CreateSubjectTaskActionState,
  formData: FormData
): Promise<CreateSubjectTaskActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateSubjectTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      createSubjectTaskForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getManagerSubjectDetailRoute(data.subject_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
    }),
  });
}

export async function updateSubjectTaskAction(
  _prevState: UpdateSubjectTaskActionState,
  formData: FormData
): Promise<UpdateSubjectTaskActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateSubjectTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateSubjectTaskForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getManagerSubjectDetailRoute(data.subject_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
    }),
  });
}

export async function deleteSubjectTaskAction(
  _prevState: DeleteSubjectTaskActionState,
  formData: FormData
): Promise<DeleteSubjectTaskActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const subjectId = String(formData.get("subject_id") ?? "").trim();

  if (!id || !subjectId) {
    return {
      success: false,
      error: "Subject task not found.",
    };
  }

  return runManagerMutation({
    data: { id, subjectId },
    mutate: ({ adminClient, actor, data }) =>
      deleteSubjectTaskForManager(adminClient, actor.userId, actor, data.id),
    revalidate: (_result, data) => {
      revalidatePath(getManagerSubjectDetailRoute(data.subjectId));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}
