"use server";
import { PERMISSIONS } from "@/lib/constants/permissions";

import { runManagerAction } from "@/lib/actions/run-manager-action";
import {
  parseAssignClassTeacherFormData,
  parseUnassignClassTeacherFormData,
} from "@/lib/validators/manager/assign-class-teacher";
import {
  parseCreateClassFormData,
} from "@/lib/validators/manager/create-class";
import {
  parseChangeClassStatusFormData,
  parseUpdateClassFormData,
} from "@/lib/validators/manager/update-class";
import {
  assignTeacherToClassForManager,
  createClassForManager,
  unassignTeacherFromClassForManager,
  updateClassForManager,
  updateClassStatusForManager,
} from "@/services/classes/class.service";
import type {
  AssignClassTeacherActionState,
  CreateClassActionState,
  UnassignClassTeacherActionState,
  UpdateClassActionState,
  UpdateClassStatusActionState,
} from "@/types/manager-class-detail";

function readClassCoverFile(formData: FormData): File | null {
  const value = formData.get("image");
  if (!(value instanceof File) || value.size <= 0) {
    return null;
  }
  return value;
}

export async function createClassAction(
  _prevState: CreateClassActionState,
  formData: FormData
): Promise<CreateClassActionState> {
  return runManagerAction({
    permission: PERMISSIONS.CLASSES_CREATE,
    formData,
    parse: parseCreateClassFormData,
    mutate: ({ adminClient, actor, data }) =>
      createClassForManager(adminClient, actor.userId, actor, {
        ...data,
        image: readClassCoverFile(formData),
      }),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      classRow: result.classRow,
    }),
  });
}

export async function updateClassAction(
  _prevState: UpdateClassActionState,
  formData: FormData
): Promise<UpdateClassActionState> {
  return runManagerAction({
    permission: PERMISSIONS.CLASSES_UPDATE,
    formData,
    parse: parseUpdateClassFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateClassForManager(adminClient, actor.userId, actor, {
        ...data,
        image: readClassCoverFile(formData),
        removeImage: formData.get("remove_image") === "1",
      }),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      classRow: result.classRow,
    }),
  });
}

export async function updateClassStatusAction(
  _prevState: UpdateClassStatusActionState,
  formData: FormData
): Promise<UpdateClassStatusActionState> {
  return runManagerAction({
    permission: PERMISSIONS.CLASSES_CHANGE_STATUS,
    formData,
    parse: parseChangeClassStatusFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateClassStatusForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      warning: result.warning,
      classRow: result.classRow,
    }),
  });
}

export async function assignClassTeacherAction(
  _prevState: AssignClassTeacherActionState,
  formData: FormData
): Promise<AssignClassTeacherActionState> {
  return runManagerAction({
    permission: PERMISSIONS.CLASSES_ASSIGN_TEACHER,
    formData,
    parse: parseAssignClassTeacherFormData,
    mutate: ({ adminClient, actor, data }) =>
      assignTeacherToClassForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      teacher: result.teacher,
      classRow: result.classRow,
    }),
  });
}

export async function unassignClassTeacherAction(
  _prevState: UnassignClassTeacherActionState,
  formData: FormData
): Promise<UnassignClassTeacherActionState> {
  return runManagerAction({
    permission: PERMISSIONS.CLASSES_UNASSIGN_TEACHER,
    formData,
    parse: parseUnassignClassTeacherFormData,
    mutate: ({ adminClient, actor, data }) =>
      unassignTeacherFromClassForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      teacherId: result.teacherId,
      classRow: result.classRow,
    }),
  });
}
