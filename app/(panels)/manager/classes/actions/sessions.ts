"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  runManagerAction,
  runManagerMutation,
} from "@/lib/actions/run-manager-action";
import {
  getManagerClassDetailRoute,
  getTeacherClassDetailRoute,
} from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import {
  parseCreateClassSessionFormData,
} from "@/lib/validators/manager/create-class-session";
import {
  parseUpdateClassSessionFormData,
} from "@/lib/validators/manager/update-class-session";
import {
  parseUpdateSessionSettingsFormData,
} from "@/lib/validators/manager/update-session-settings";
import {
  parseSkipClassWeekFormData,
  parseUnskipClassWeekFormData,
} from "@/lib/validators/manager/class-week-skip";
import { createClassSessionForManager } from "@/services/classes/class.service";
import {
  skipClassWeekForManager,
  unskipClassWeekForManager,
} from "@/services/classes/class-session-skip.service";
import {
  deleteClassSessionForManager,
  updateClassSessionForManager,
  updateSessionSettingsForManager,
} from "@/services/classes/session.service";
import type {
  CreateClassSessionActionState,
} from "@/types/manager-class-detail";
import type {
  DeleteClassSessionActionState,
  UpdateClassSessionActionState,
  UpdateSessionSettingsActionState,
} from "@/types/manager-class-session-detail";
import type {
  SkipClassWeekActionState,
  UnskipClassWeekActionState,
} from "@/types/manager-class-week-skip";
import { resolveClassReturnPath } from "./helpers";

function revalidateClassDetailRoutes(classId: string) {
  revalidatePath(getManagerClassDetailRoute(classId));
  revalidatePath(getTeacherClassDetailRoute(classId));
}

export async function skipClassWeekAction(
  _prevState: SkipClassWeekActionState,
  formData: FormData
): Promise<SkipClassWeekActionState> {
  return runManagerAction({
    formData,
    parse: parseSkipClassWeekFormData,
    mutate: ({ adminClient, actor, data }) =>
      skipClassWeekForManager(adminClient, actor, data),
    revalidate: (_result, data) => revalidateClassDetailRoutes(data.class_id),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      weekSkipState: result.state,
      deletedSessionId: result.deletedSessionId,
    }),
  });
}

export async function unskipClassWeekAction(
  _prevState: UnskipClassWeekActionState,
  formData: FormData
): Promise<UnskipClassWeekActionState> {
  return runManagerAction({
    formData,
    parse: parseUnskipClassWeekFormData,
    mutate: ({ adminClient, actor, data }) =>
      unskipClassWeekForManager(adminClient, actor, data),
    revalidate: (_result, data) => revalidateClassDetailRoutes(data.class_id),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      weekSkipState: result.state,
      createdSession: result.createdSession,
    }),
  });
}

export async function createClassSessionAction(
  _prevState: CreateClassSessionActionState,
  formData: FormData
): Promise<CreateClassSessionActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateClassSessionFormData,
    mutate: ({ adminClient, actor, data }) =>
      createClassSessionForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      session: result.session,
      classRow: result.classRow,
    }),
  });
}

export async function updateSessionSettingsAction(
  _prevState: UpdateSessionSettingsActionState,
  formData: FormData
): Promise<UpdateSessionSettingsActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateSessionSettingsFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateSessionSettingsForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      session: result.session,
    }),
  });
}

export async function updateClassSessionAction(
  _prevState: UpdateClassSessionActionState,
  formData: FormData
): Promise<UpdateClassSessionActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateClassSessionFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateClassSessionForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      session: result.session,
    }),
  });
}

export async function deleteClassSessionAction(
  _prevState: DeleteClassSessionActionState,
  formData: FormData
): Promise<DeleteClassSessionActionState> {
  const sessionId = String(formData.get("session_id") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "").trim();

  if (!sessionId) {
    return {
      success: false,
      error: "Session not found.",
    };
  }

  return runManagerMutation({
    data: sessionId,
    mutate: ({ adminClient, actor, data }) =>
      deleteClassSessionForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(getManagerClassDetailRoute(result.classId));
      revalidatePath(getTeacherClassDetailRoute(result.classId));
    },
    mapSuccess: (result) => {
      redirect(
        appendQueryParam(
          resolveClassReturnPath(
            returnTo,
            result.classId,
            getManagerClassDetailRoute
          ),
          "toast",
          "session_deleted"
        )
      );
    },
  });
}
