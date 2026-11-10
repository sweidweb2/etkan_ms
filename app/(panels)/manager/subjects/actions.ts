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
import { parseAssignSubjectsToStageFormData } from "@/lib/validators/manager/assign-subjects-to-stage";
import { parseCreateStageFormData } from "@/lib/validators/manager/create-stage";
import { parseCreateSubjectFormData } from "@/lib/validators/manager/create-subject";
import { parseReorderStagesFormData } from "@/lib/validators/manager/reorder-stages";
import { parseSaveSubjectBoardFormData } from "@/lib/validators/manager/save-subject-board";
import { parseSetSubjectStageFormData } from "@/lib/validators/manager/set-subject-stage";
import { parseUpdateSubjectFormData } from "@/lib/validators/manager/update-subject";
import { parseCreateSubjectTaskFormData } from "@/lib/validators/manager/create-subject-task";
import { parseUpdateSubjectTaskFormData } from "@/lib/validators/manager/update-subject-task";
import {
  createSubjectForManager,
  deleteSubjectForManager,
  updateSubjectForManager,
} from "@/services/classes/subject.service";
import {
  assignSubjectsToStageForManager,
  createStageForManager,
  reorderStagesForManager,
  saveSubjectBoardForManager,
  setSubjectStageForManager,
} from "@/services/subjects/stage.service";
import {
  createSubjectTaskForManager,
  deleteSubjectTaskForManager,
  updateSubjectTaskForManager,
} from "@/services/subjects/subject-tasks.service";
import type {
  AssignSubjectsToStageActionState,
  CreateStageActionState,
  ReorderStagesActionState,
  SaveSubjectBoardActionState,
  SetSubjectStageActionState,
} from "@/types/manager-stage";
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

export async function createStageAction(
  _prevState: CreateStageActionState,
  formData: FormData
): Promise<CreateStageActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateStageFormData,
    mutate: ({ adminClient, actor, data }) =>
      createStageForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_SUBJECTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      stage: result.stage,
    }),
  });
}

export async function assignSubjectsToStageAction(
  _prevState: AssignSubjectsToStageActionState,
  formData: FormData
): Promise<AssignSubjectsToStageActionState> {
  return runManagerAction({
    formData,
    parse: parseAssignSubjectsToStageFormData,
    mutate: ({ adminClient, actor, data }) =>
      assignSubjectsToStageForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_SUBJECTS);
    },
    mapSuccess: (result, data) => ({
      success: true,
      message: result.message,
      subjectIds: data.subject_ids,
      stageId: result.stageId,
    }),
  });
}

export async function setSubjectStageAction(
  _prevState: SetSubjectStageActionState,
  formData: FormData
): Promise<SetSubjectStageActionState> {
  return runManagerAction({
    formData,
    parse: parseSetSubjectStageFormData,
    mutate: ({ adminClient, actor, data }) =>
      setSubjectStageForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_SUBJECTS);
    },
    mapSuccess: (result, data) => ({
      success: true,
      message: result.message,
      subjectId: data.subject_id,
      stageId: data.stage_id,
    }),
  });
}

export async function reorderStagesAction(
  _prevState: ReorderStagesActionState,
  formData: FormData
): Promise<ReorderStagesActionState> {
  return runManagerAction({
    formData,
    parse: parseReorderStagesFormData,
    mutate: ({ adminClient, actor, data }) =>
      reorderStagesForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_SUBJECTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      stages: result.stages,
    }),
  });
}

export async function saveSubjectBoardAction(
  _prevState: SaveSubjectBoardActionState,
  formData: FormData
): Promise<SaveSubjectBoardActionState> {
  return runManagerAction({
    formData,
    parse: parseSaveSubjectBoardFormData,
    mutate: ({ adminClient, actor, data }) =>
      saveSubjectBoardForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_SUBJECTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

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
    mapSuccess: (result, data) => ({
      success: true,
      message: result.message,
      taskId: data.id,
    }),
  });
}
