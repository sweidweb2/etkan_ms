"use server";

import { runManagerAction } from "@/lib/actions/run-manager-action";
import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidateManagerPeopleLists } from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseChangeStudentStatusFormData } from "@/lib/validators/manager/change-student-status";
import { parseCreateStudentFormData } from "@/lib/validators/manager/create-student";
import { parseUpdateStudentFormData } from "@/lib/validators/manager/update-student";
import {
  createStudent,
  listAssignableClassesForStudentManager,
  listStudentsPageForManager,
  updateStudent,
} from "@/services/students/student.service";
import type { ManagerClassOption } from "@/types/manager-class";
import {
  changeStudentStatusForManager,
  getStudentStatusSideEffectsPreview,
} from "@/services/students/student-status.service";
import type {
  ChangeStudentStatusActionState,
  CreateStudentActionState,
  ManagerStudentsListData,
  ManagerStudentsListQuery,
  StudentStatusSideEffectsPreview,
  UpdateStudentActionState,
} from "@/types/manager-student";

export async function loadStudentsPageAction(
  query: ManagerStudentsListQuery
): Promise<ManagerStudentsListData | null> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listStudentsPageForManager(adminClient, actor.userId, query);
  } catch {
    return null;
  }
}

export async function loadAssignableClassesForStudentAction(
  studentUserId: string
): Promise<ManagerClassOption[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listAssignableClassesForStudentManager(
      adminClient,
      actor.userId,
      studentUserId
    );
  } catch {
    return [];
  }
}

export async function createStudentAction(
  _prevState: CreateStudentActionState,
  formData: FormData
): Promise<CreateStudentActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateStudentFormData,
    mutate: ({ adminClient, actor, data }) =>
      createStudent(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidateManagerPeopleLists();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      student: result.student,
    }),
  });
}

export async function updateStudentAction(
  _prevState: UpdateStudentActionState,
  formData: FormData
): Promise<UpdateStudentActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateStudentFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateStudent(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidateManagerPeopleLists();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      student: result.student,
    }),
  });
}

export async function changeStudentStatusAction(
  _prevState: ChangeStudentStatusActionState,
  formData: FormData
): Promise<ChangeStudentStatusActionState> {
  return runManagerAction({
    formData,
    parse: parseChangeStudentStatusFormData,
    mutate: ({ adminClient, actor, data }) =>
      changeStudentStatusForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidateManagerPeopleLists();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      warning: result.warning,
      status: result.status,
    }),
  });
}

export async function loadStudentStatusSideEffectsPreviewAction(
  userId: string
): Promise<
  | { success: true; preview: StudentStatusSideEffectsPreview }
  | { success: false; error: string }
> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();

  try {
    const preview = await getStudentStatusSideEffectsPreview(
      adminClient,
      actor.userId,
      userId
    );
    return { success: true, preview };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load student status details.",
    };
  }
}
