"use server";
import { PERMISSIONS } from "@/lib/constants/permissions";

import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import {
  getManagerClassDetailRoute,
  getManagerClassTaskDetailRoute,
  getManagerSubjectDetailRoute,
  getStudentClassDetailRoute,
  getStudentClassTaskDetailRoute,
  getTeacherClassDetailRoute,
  getTeacherClassTaskDetailRoute,
} from "@/lib/constants/routes";
import {
  parseDeleteTaskAttachmentFormData,
  parseTaskAttachmentSignedUrlFormData,
  parseUploadTaskAttachmentFormData,
} from "@/lib/validators/manager/task-attachment";
import {
  deleteTaskAttachmentForActor,
  getTaskAttachmentSignedUrlForActor,
  uploadTaskAttachmentForActor,
} from "@/services/classes/task-attachments.service";
import type {
  DeleteTaskAttachmentActionState,
  TaskAttachmentSignedUrlActionState,
  UploadTaskAttachmentActionState,
} from "@/types/task-attachment";

function revalidateAttachmentSurfaces(result: {
  classId: string | null;
  subjectId: string | null;
  entityId?: string;
}) {
  if (result.subjectId) {
    revalidatePath(getManagerSubjectDetailRoute(result.subjectId));
  }

  if (result.classId && result.entityId) {
    revalidatePath(getManagerClassDetailRoute(result.classId));
    revalidatePath(
      getManagerClassTaskDetailRoute(result.classId, result.entityId)
    );
    revalidatePath(getTeacherClassDetailRoute(result.classId));
    revalidatePath(
      getTeacherClassTaskDetailRoute(result.classId, result.entityId)
    );
    revalidatePath(getStudentClassDetailRoute(result.classId));
    revalidatePath(
      getStudentClassTaskDetailRoute(result.classId, result.entityId)
    );
  } else if (result.classId) {
    revalidatePath(getManagerClassDetailRoute(result.classId));
    revalidatePath(getTeacherClassDetailRoute(result.classId));
    revalidatePath(getStudentClassDetailRoute(result.classId));
  }
}

export async function uploadTaskAttachmentAction(
  _prevState: UploadTaskAttachmentActionState,
  formData: FormData
): Promise<UploadTaskAttachmentActionState> {
  return runManagerAction({
    permission: {
      anyOf: [
        PERMISSIONS.TASKS_UPDATE,
        PERMISSIONS.SUBJECTS_TASKS_UPDATE,
        PERMISSIONS.TEAM_LEADER_TASKS_UPDATE,
      ],
    },
    formData,
    parse: parseUploadTaskAttachmentFormData,
    mutate: ({ adminClient, actor, data }) =>
      uploadTaskAttachmentForActor(adminClient, actor, data),
    revalidate: (result) => {
      revalidateAttachmentSurfaces({
        classId: result.classId,
        subjectId: result.subjectId,
        entityId: result.attachment.entity_id,
      });
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      attachment: result.attachment,
    }),
  });
}

export async function deleteTaskAttachmentAction(
  _prevState: DeleteTaskAttachmentActionState,
  formData: FormData
): Promise<DeleteTaskAttachmentActionState> {
  return runManagerAction({
    permission: {
      anyOf: [
        PERMISSIONS.TASKS_UPDATE,
        PERMISSIONS.SUBJECTS_TASKS_UPDATE,
        PERMISSIONS.TEAM_LEADER_TASKS_UPDATE,
      ],
    },
    formData,
    parse: parseDeleteTaskAttachmentFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteTaskAttachmentForActor(adminClient, actor, data),
    revalidate: (result) => {
      revalidateAttachmentSurfaces({
        classId: result.classId,
        subjectId: result.subjectId,
        entityId: result.entityId,
      });
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function getTaskAttachmentSignedUrlAction(
  formData: FormData
): Promise<TaskAttachmentSignedUrlActionState> {
  return runManagerAction({
    permission: {
      anyOf: [
        PERMISSIONS.TASKS_VIEW,
        PERMISSIONS.SUBJECTS_TASKS_VIEW,
        PERMISSIONS.TEAM_LEADER_TASKS_UPDATE,
      ],
    },
    formData,
    parse: parseTaskAttachmentSignedUrlFormData,
    mutate: ({ adminClient, actor, data }) =>
      getTaskAttachmentSignedUrlForActor(adminClient, actor.userId, data),
    mapSuccess: (result) => ({
      success: true,
      signedUrl: result.signedUrl,
      fileName: result.fileName,
    }),
  });
}
