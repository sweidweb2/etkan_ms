"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  runManagerAction,
  runManagerMutation,
} from "@/lib/actions/run-manager-action";
import {
  getTeacherClassDetailRoute,
  getTeacherClassSessionDetailRoute,
  getTeacherClassSessionTaskDetailRoute,
} from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { parseCreateSessionTaskFormData } from "@/lib/validators/manager/create-session-task";
import { parseEditStudentTaskFormData } from "@/lib/validators/manager/edit-student-task";
import {
  parseDeleteStudentTaskUploadFormData,
  parseStudentTaskUploadSignedUrlFormData,
  parseUploadStudentTaskFileFormData,
} from "@/lib/validators/manager/student-task-upload";
import { parseUpdateSessionTaskFormData } from "@/lib/validators/manager/update-session-task";
import {
  createSessionTaskForTeacher,
  deleteSessionTaskForTeacher,
  deleteStudentTaskUploadForTeacher,
  getStudentTaskUploadSignedUrlForTeacher,
  updateSessionTaskForTeacher,
  updateStudentTaskForTeacher,
  uploadStudentTaskFileForTeacher,
} from "@/services/classes/teacher-session-tasks.service";
import type {
  CreateSessionTaskActionState,
  DeleteSessionTaskActionState,
  DeleteStudentTaskUploadActionState,
  UpdateSessionTaskActionState,
  UpdateStudentTaskActionState,
  UploadStudentTaskFileActionState,
} from "@/types/manager-class-session-detail";

export async function createSessionTaskAction(
  _prevState: CreateSessionTaskActionState,
  formData: FormData
): Promise<CreateSessionTaskActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateSessionTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      createSessionTaskForTeacher(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getTeacherClassDetailRoute(data.class_id));
      revalidatePath(
        getTeacherClassSessionDetailRoute(data.class_id, data.session_id)
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
    }),
  });
}

export async function updateSessionTaskAction(
  _prevState: UpdateSessionTaskActionState,
  formData: FormData
): Promise<UpdateSessionTaskActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateSessionTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateSessionTaskForTeacher(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getTeacherClassDetailRoute(data.class_id));
      revalidatePath(
        getTeacherClassSessionDetailRoute(data.class_id, data.session_id)
      );
      revalidatePath(
        getTeacherClassSessionTaskDetailRoute(
          data.class_id,
          data.session_id,
          data.id
        )
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
      gradesClamped: result.gradesClamped,
    }),
  });
}

export async function deleteSessionTaskAction(
  _prevState: DeleteSessionTaskActionState,
  formData: FormData
): Promise<DeleteSessionTaskActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();
  const session_id = String(formData.get("session_id") ?? "").trim();

  if (!id || !class_id || !session_id) {
    return {
      success: false,
      error: "Task not found.",
    };
  }

  return runManagerMutation({
    data: { id, class_id, session_id },
    mutate: ({ adminClient, actor, data }) =>
      deleteSessionTaskForTeacher(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(getTeacherClassDetailRoute(result.classId));
      revalidatePath(
        getTeacherClassSessionDetailRoute(result.classId, result.sessionId)
      );
    },
    mapSuccess: (result) => {
      redirect(
        appendQueryParam(
          getTeacherClassSessionDetailRoute(result.classId, result.sessionId),
          "toast",
          "task_deleted"
        )
      );
    },
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
      updateStudentTaskForTeacher(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      if (result.classId) {
        revalidatePath(getTeacherClassDetailRoute(result.classId));
      }

      if (result.classId && result.sessionId) {
        revalidatePath(
          getTeacherClassSessionDetailRoute(result.classId, result.sessionId)
        );
        revalidatePath(
          getTeacherClassSessionTaskDetailRoute(
            result.classId,
            result.sessionId,
            result.studentTask.task_id
          )
        );
      }
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
      uploadStudentTaskFileForTeacher(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      if (result.classId) {
        revalidatePath(getTeacherClassDetailRoute(result.classId));
      }

      if (result.classId && result.sessionId) {
        revalidatePath(
          getTeacherClassSessionDetailRoute(result.classId, result.sessionId)
        );
        revalidatePath(
          getTeacherClassSessionTaskDetailRoute(
            result.classId,
            result.sessionId,
            result.taskId
          )
        );
      }
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
      deleteStudentTaskUploadForTeacher(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      if (result.classId) {
        revalidatePath(getTeacherClassDetailRoute(result.classId));
      }

      if (result.classId && result.sessionId) {
        revalidatePath(
          getTeacherClassSessionDetailRoute(result.classId, result.sessionId)
        );
        revalidatePath(
          getTeacherClassSessionTaskDetailRoute(
            result.classId,
            result.sessionId,
            result.taskId
          )
        );
      }
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
      getStudentTaskUploadSignedUrlForTeacher(adminClient, actor.userId, data),
    mapSuccess: (result) => ({
      success: true,
      signedUrl: result.signedUrl,
    }),
  });
}
