"use server";

import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import {
  getManagerClassDetailRoute,
  getManagerClassTaskDetailRoute,
  getTeacherClassDetailRoute,
  getTeacherClassTaskDetailRoute,
} from "@/lib/constants/routes";
import {
  parseEditStudentTaskFormData,
} from "@/lib/validators/manager/edit-student-task";
import {
  parseDeleteStudentTaskUploadFormData,
  parseStudentTaskUploadSignedUrlFormData,
  parseUploadStudentTaskFileFormData,
} from "@/lib/validators/manager/student-task-upload";
import {
  parseUpdateAttendeeFormData,
} from "@/lib/validators/manager/update-attendee";
import {
  updateAttendeeForManager,
  updateStudentTaskForManager,
} from "@/services/classes/session.service";
import {
  deleteStudentTaskUploadForManager,
  getStudentTaskUploadSignedUrlForManager,
  uploadStudentTaskFileForManager,
} from "@/services/classes/student-task-upload.service";
import type {
  DeleteStudentTaskUploadActionState,
  UpdateAttendeeActionState,
  UpdateStudentTaskActionState,
  UploadStudentTaskFileActionState,
} from "@/types/manager-class-session-detail";

export async function updateAttendeeAction(
  _prevState: UpdateAttendeeActionState,
  formData: FormData
): Promise<UpdateAttendeeActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateAttendeeFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateAttendeeForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      attendee: result.attendee,
    }),
  });
}

export async function updateStudentTaskAction(
  _prevState: UpdateStudentTaskActionState,
  formData: FormData
): Promise<UpdateStudentTaskActionState> {
  return runManagerAction({
    formData,
    parse: parseEditStudentTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateStudentTaskForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      if (!result.classId) {
        return;
      }

      const taskId = result.studentTask.task_id;
      revalidatePath(getManagerClassDetailRoute(result.classId));
      revalidatePath(getManagerClassTaskDetailRoute(result.classId, taskId));
      // Teacher grades on the task page; skip full class-detail RSC reload.
      revalidatePath(getTeacherClassTaskDetailRoute(result.classId, taskId));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      studentTask: result.studentTask,
    }),
  });
}

export async function uploadStudentTaskFileAction(
  _prevState: UploadStudentTaskFileActionState,
  formData: FormData
): Promise<UploadStudentTaskFileActionState> {
  return runManagerAction({
    formData,
    parse: parseUploadStudentTaskFileFormData,
    mutate: ({ adminClient, actor, data }) =>
      uploadStudentTaskFileForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      if (!result.classId) {
        return;
      }

      revalidatePath(getManagerClassDetailRoute(result.classId));
      revalidatePath(
        getManagerClassTaskDetailRoute(result.classId, result.taskId)
      );
      revalidatePath(getTeacherClassDetailRoute(result.classId));
      revalidatePath(
        getTeacherClassTaskDetailRoute(result.classId, result.taskId)
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      upload: result.upload,
    }),
  });
}

export async function deleteStudentTaskUploadAction(
  _prevState: DeleteStudentTaskUploadActionState,
  formData: FormData
): Promise<DeleteStudentTaskUploadActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteStudentTaskUploadFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteStudentTaskUploadForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      if (!result.classId) {
        return;
      }

      revalidatePath(getManagerClassDetailRoute(result.classId));
      revalidatePath(
        getManagerClassTaskDetailRoute(result.classId, result.taskId)
      );
      revalidatePath(getTeacherClassDetailRoute(result.classId));
      revalidatePath(
        getTeacherClassTaskDetailRoute(result.classId, result.taskId)
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      uploadId: result.uploadId,
    }),
  });
}

export async function getStudentTaskUploadSignedUrlAction(
  formData: FormData
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  return runManagerAction({
    formData,
    parse: parseStudentTaskUploadSignedUrlFormData,
    mutate: ({ adminClient, actor, data }) =>
      getStudentTaskUploadSignedUrlForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    mapSuccess: (result) => ({
      success: true,
      signedUrl: result.signedUrl,
    }),
  });
}
