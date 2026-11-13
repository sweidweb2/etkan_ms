"use server";

import { revalidatePath } from "next/cache";
import {
  runManagerAction,
  runManagerMutation,
} from "@/lib/actions/run-manager-action";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getManagerClassDetailRoute,
  getStudentClassDetailRoute,
  getTeacherClassDetailRoute,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateClassTaskFormData } from "@/lib/validators/manager/create-class-task";
import { parseUpdateClassTaskFormData } from "@/lib/validators/manager/update-class-task";
import { parseUpdateAttendeeFormData } from "@/lib/validators/manager/update-attendee";
import {
  createClassTaskForTeamLeader,
  getTeamLeaderSessionAttendanceForSelf,
  startClassTaskForTeamLeader,
  updateAttendeeForTeamLeader,
  updateClassTaskForTeamLeader,
} from "@/services/classes/class-team-leader.service";
import type {
  CreateClassTaskActionState,
  SetClassTaskStartedActionState,
  UpdateAttendeeActionState,
  UpdateClassTaskActionState,
} from "@/types/manager-class-session-detail";
import type { LoadTeamLeaderSessionAttendanceResult } from "@/types/student-team-leader";

function revalidateClassTaskSurfaces(classId: string) {
  revalidatePath(getStudentClassDetailRoute(classId));
  revalidatePath(getManagerClassDetailRoute(classId));
  revalidatePath(getTeacherClassDetailRoute(classId));
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
