"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getStudentClassDetailRoute,
  getStudentClassTaskDetailRoute,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseDeleteStudentTaskUploadFormData,
  parseUploadStudentTaskFileFormData,
} from "@/lib/validators/manager/student-task-upload";
import {
  deleteStudentTaskUploadForSelf,
  getStudentTaskUploadSignedUrlForSelf,
  uploadStudentTaskFileForSelf,
} from "@/services/classes/student-task-upload-self.service";
import type {
  DeleteStudentTaskUploadActionState,
  StudentTaskUploadActionState,
} from "@/types/student-class";

function revalidateStudentTaskSurfaces(classId: string, taskId: string) {
  revalidatePath(getStudentClassDetailRoute(classId));
  revalidatePath(getStudentClassTaskDetailRoute(classId, taskId));
}

export async function uploadStudentTaskFileForSelfAction(
  _prevState: StudentTaskUploadActionState,
  formData: FormData
): Promise<StudentTaskUploadActionState> {
  const parsed = parseUploadStudentTaskFileFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const actor = await getSessionAuditActor();
  const result = await uploadStudentTaskFileForSelf(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateStudentTaskSurfaces(result.classId, result.taskId);

  return {
    success: true,
    message: result.message,
    upload: result.upload,
  };
}

export async function deleteStudentTaskUploadForSelfAction(
  _prevState: DeleteStudentTaskUploadActionState,
  formData: FormData
): Promise<DeleteStudentTaskUploadActionState> {
  const parsed = parseDeleteStudentTaskUploadFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const actor = await getSessionAuditActor();
  const result = await deleteStudentTaskUploadForSelf(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateStudentTaskSurfaces(result.classId, result.taskId);

  return {
    success: true,
    message: result.message,
    uploadId: result.uploadId,
  };
}

export async function getStudentTaskUploadSignedUrlForSelfAction(
  uploadId: string
): Promise<{ success: true; signedUrl: string } | { success: false; error: string }> {
  const adminClient = createSupabaseAdminClient();
  const actor = await getSessionAuditActor();
  const result = await getStudentTaskUploadSignedUrlForSelf(
    adminClient,
    actor.userId,
    { id: uploadId }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, signedUrl: result.signedUrl };
}
