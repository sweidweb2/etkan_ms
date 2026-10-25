"use server";

/**
 * Teacher panel class actions.
 *
 * Security for assigned-class writes lives in class services via
 * `assertAssignedTeacherForClassMutation` — not in these wrappers.
 * Shared teaching UI under `components/manager/classes` and
 * `components/classes` may call `@/app/manager/classes/actions` directly;
 * that is fine because the service layer enforces `class_teacher` scope.
 * Wrappers here remain for teacher-only call sites (search, inline session).
 */
import {
  deleteClassTaskAction,
  deleteStudentTaskUploadAction,
  getStudentTaskUploadSignedUrlAction,
  setClassTaskStartedAction,
  updateStudentTaskAction,
  uploadStudentTaskFileAction,
} from "@/app/manager/classes/actions";
import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getTeachingClassSessionInlineDetailForSelf,
  listTeachingClassesForSelf,
} from "@/services/classes/teacher-class-self.service";
import type {
  DeleteClassTaskActionState,
  DeleteStudentTaskUploadActionState,
  SetClassTaskStartedActionState,
  UpdateStudentTaskActionState,
  UploadStudentTaskFileActionState,
} from "@/types/manager-class-session-detail";
import type {
  TeacherClassRow,
  TeachingClassSessionInlineDetail,
} from "@/types/class-teaching";

export async function deleteTeacherClassTaskAction(
  prevState: DeleteClassTaskActionState,
  formData: FormData
): Promise<DeleteClassTaskActionState> {
  return deleteClassTaskAction(prevState, formData);
}

export async function setTeacherClassTaskStartedAction(
  prevState: SetClassTaskStartedActionState,
  formData: FormData
): Promise<SetClassTaskStartedActionState> {
  return setClassTaskStartedAction(prevState, formData);
}

export async function updateTeacherStudentTaskAction(
  prevState: UpdateStudentTaskActionState,
  formData: FormData
): Promise<UpdateStudentTaskActionState> {
  return updateStudentTaskAction(prevState, formData);
}

export async function uploadTeacherStudentTaskFileAction(
  prevState: UploadStudentTaskFileActionState,
  formData: FormData
): Promise<UploadStudentTaskFileActionState> {
  return uploadStudentTaskFileAction(prevState, formData);
}

export async function deleteTeacherStudentTaskUploadAction(
  prevState: DeleteStudentTaskUploadActionState,
  formData: FormData
): Promise<DeleteStudentTaskUploadActionState> {
  return deleteStudentTaskUploadAction(prevState, formData);
}

export async function getTeacherStudentTaskUploadSignedUrlAction(
  formData: FormData
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  return getStudentTaskUploadSignedUrlAction(formData);
}

export type TeacherClassSessionInlineDetail = TeachingClassSessionInlineDetail;

/** Lightweight class list for the teacher navbar search suggestions. */
export async function loadTeacherSearchClassesAction(): Promise<
  Array<Pick<TeacherClassRow, "id" | "name" | "subject_name">>
> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();

  try {
    const rows = await listTeachingClassesForSelf(adminClient, actor.userId);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      subject_name: row.subject_name,
    }));
  } catch {
    return [];
  }
}

/** Load attendance-ready session detail for the teacher class Sessions tab. */
export async function loadTeacherClassSessionDetailAction(
  classId: string,
  sessionId: string
): Promise<TeacherClassSessionInlineDetail | null> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();

  try {
    return await getTeachingClassSessionInlineDetailForSelf(
      adminClient,
      actor.userId,
      classId,
      sessionId
    );
  } catch {
    return null;
  }
}
