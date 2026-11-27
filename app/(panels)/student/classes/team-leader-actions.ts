"use server";
import { PERMISSIONS } from "@/lib/constants/permissions";

import { revalidatePath } from "next/cache";
import {
  runManagerAction,
  runManagerMutation,
} from "@/lib/actions/run-manager-action";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getManagerClassDetailRoute,
  getManagerClassTaskDetailRoute,
  getStudentClassDetailRoute,
  getStudentClassTaskDetailRoute,
  getTeacherClassDetailRoute,
  getTeacherClassTaskDetailRoute,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateClassTaskFormData } from "@/lib/validators/manager/create-class-task";
import { parseUpdateClassTaskFormData } from "@/lib/validators/manager/update-class-task";
import { parseUpdateAttendeeFormData } from "@/lib/validators/manager/update-attendee";
import {
  parseDeleteTaskAttachmentFormData,
  parseTaskAttachmentSignedUrlFormData,
  parseUploadTaskAttachmentFormData,
} from "@/lib/validators/manager/task-attachment";
import {
  createClassTaskForTeamLeader,
  getTeamLeaderSessionAttendanceForSelf,
  startClassTaskForTeamLeader,
  updateAttendeeForTeamLeader,
  updateClassTaskForTeamLeader,
} from "@/services/classes/class-team-leader.service";
import {
  deleteTaskAttachmentForActor,
  getTaskAttachmentSignedUrlForActor,
  uploadTaskAttachmentForActor,
} from "@/services/classes/task-attachments.service";
import type {
  CreateClassTaskActionState,
  SetClassTaskStartedActionState,
  UpdateAttendeeActionState,
  UpdateClassTaskActionState,
} from "@/types/manager-class-session-detail";
import type {
  DeleteTaskAttachmentActionState,
  TaskAttachmentSignedUrlActionState,
  UploadTaskAttachmentActionState,
} from "@/types/task-attachment";
import type { LoadTeamLeaderSessionAttendanceResult } from "@/types/student-team-leader";

function revalidateClassTaskSurfaces(classId: string, taskId?: string) {
  revalidatePath(getStudentClassDetailRoute(classId));
  revalidatePath(getManagerClassDetailRoute(classId));
  revalidatePath(getTeacherClassDetailRoute(classId));
  if (taskId) {
    revalidatePath(getStudentClassTaskDetailRoute(classId, taskId));
    revalidatePath(getManagerClassTaskDetailRoute(classId, taskId));
    revalidatePath(getTeacherClassTaskDetailRoute(classId, taskId));
  }
}

export async function loadTeamLeaderSessionAttendanceAction(
  classId: string,
  sessionId: string
): Promise<LoadTeamLeaderSessionAttendanceResult> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();

  try {
    const result = await getTeamLeaderSessionAttendanceForSelf(
      adminClient,
      actor.userId,
      classId,
      sessionId
    );
    return result.success
      ? { success: true, data: result.data }
      : { success: false, error: result.error };
  } catch {
    return { success: false, error: "Unable to load attendance." };
  }
}

export async function updateTeamLeaderAttendeeAction(
  _prevState: UpdateAttendeeActionState,
  formData: FormData
): Promise<UpdateAttendeeActionState> {
  return runManagerAction({
    permission: PERMISSIONS.TEAM_LEADER_ATTENDANCE_UPDATE,
    formData,
    parse: parseUpdateAttendeeFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateAttendeeForTeamLeader(adminClient, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getStudentClassDetailRoute(data.class_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      attendee: result.attendee,
    }),
  });
}

export async function createTeamLeaderClassTaskAction(
  _prevState: CreateClassTaskActionState,
  formData: FormData
): Promise<CreateClassTaskActionState> {
  return runManagerAction({
    permission: PERMISSIONS.TEAM_LEADER_TASKS_CREATE,
    formData,
    parse: parseCreateClassTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      createClassTaskForTeamLeader(adminClient, actor, data),
    revalidate: (_result, data) => {
      revalidateClassTaskSurfaces(data.class_id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
    }),
  });
}

export async function updateTeamLeaderClassTaskAction(
  _prevState: UpdateClassTaskActionState,
  formData: FormData
): Promise<UpdateClassTaskActionState> {
  return runManagerAction({
    permission: PERMISSIONS.TEAM_LEADER_TASKS_UPDATE,
    formData,
    parse: parseUpdateClassTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateClassTaskForTeamLeader(adminClient, actor, data),
    revalidate: (_result, data) => {
      revalidateClassTaskSurfaces(data.class_id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
      gradesClamped: result.gradesClamped,
    }),
  });
}

export async function startTeamLeaderClassTaskAction(
  _prevState: SetClassTaskStartedActionState,
  formData: FormData
): Promise<SetClassTaskStartedActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!id || !class_id) {
    return { success: false, error: "Task not found." };
  }

  return runManagerMutation({
    permission: PERMISSIONS.TEAM_LEADER_TASKS_START,
    data: { id, class_id },
    mutate: ({ adminClient, actor, data }) =>
      startClassTaskForTeamLeader(adminClient, actor, data),
    revalidate: (_result, data) => {
      revalidateClassTaskSurfaces(data.class_id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
    }),
  });
}

export async function uploadTeamLeaderTaskAttachmentAction(
  _prevState: UploadTaskAttachmentActionState,
  formData: FormData
): Promise<UploadTaskAttachmentActionState> {
  return runManagerAction({
    permission: {
      anyOf: [PERMISSIONS.TASKS_UPDATE, PERMISSIONS.TEAM_LEADER_TASKS_UPDATE],
    },
    formData,
    parse: parseUploadTaskAttachmentFormData,
    mutate: ({ adminClient, actor, data }) =>
      uploadTaskAttachmentForActor(adminClient, actor, data),
    revalidate: (result) => {
      if (result.classId) {
        revalidateClassTaskSurfaces(
          result.classId,
          result.attachment.entity_id
        );
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      attachment: result.attachment,
    }),
  });
}

export async function deleteTeamLeaderTaskAttachmentAction(
  _prevState: DeleteTaskAttachmentActionState,
  formData: FormData
): Promise<DeleteTaskAttachmentActionState> {
  return runManagerAction({
    permission: {
      anyOf: [PERMISSIONS.TASKS_UPDATE, PERMISSIONS.TEAM_LEADER_TASKS_UPDATE],
    },
    formData,
    parse: parseDeleteTaskAttachmentFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteTaskAttachmentForActor(adminClient, actor, data),
    revalidate: (result) => {
      if (result.classId) {
        revalidateClassTaskSurfaces(result.classId, result.entityId);
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function getTeamLeaderTaskAttachmentSignedUrlAction(
  formData: FormData
): Promise<TaskAttachmentSignedUrlActionState> {
  return runManagerAction({
    permission: {
      anyOf: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TEAM_LEADER_TASKS_UPDATE],
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
