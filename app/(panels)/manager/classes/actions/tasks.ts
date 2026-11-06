"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  runManagerAction,
  runManagerMutation,
} from "@/lib/actions/run-manager-action";
import {
  getManagerClassDetailRoute,
  getManagerClassTaskDetailRoute,
} from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import {
  parseCreateClassTaskFormData,
} from "@/lib/validators/manager/create-class-task";
import {
  parseUpdateClassTaskFormData,
} from "@/lib/validators/manager/update-class-task";
import {
  createClassTaskForManager,
  deleteClassTaskForManager,
  importSubjectTasksForClassForManager,
  setClassTaskStartedForManager,
  updateClassTaskForManager,
} from "@/services/classes/class-tasks.service";
import type {
  CreateClassTaskActionState,
  DeleteClassTaskActionState,
  ImportSubjectTasksActionState,
  SetClassTaskStartedActionState,
  UpdateClassTaskActionState,
} from "@/types/manager-class-session-detail";
import { resolveClassReturnPath } from "./helpers";

export async function createClassTaskAction(
  _prevState: CreateClassTaskActionState,
  formData: FormData
): Promise<CreateClassTaskActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateClassTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      createClassTaskForManager(adminClient, actor.userId, actor, data),
    revalidate: (result, data) => {
      revalidatePath(getManagerClassDetailRoute(data.class_id));
      revalidatePath(
        getManagerClassTaskDetailRoute(data.class_id, result.task.id)
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
    }),
  });
}

export async function updateClassTaskAction(
  _prevState: UpdateClassTaskActionState,
  formData: FormData
): Promise<UpdateClassTaskActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateClassTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateClassTaskForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getManagerClassDetailRoute(data.class_id));
      revalidatePath(getManagerClassTaskDetailRoute(data.class_id, data.id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
      gradesClamped: result.gradesClamped,
    }),
  });
}

export async function deleteClassTaskAction(
  _prevState: DeleteClassTaskActionState,
  formData: FormData
): Promise<DeleteClassTaskActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "").trim();

  if (!id || !class_id) {
    return {
      success: false,
      error: "Task not found.",
    };
  }

  return runManagerMutation({
    data: { id, class_id },
    mutate: ({ adminClient, actor, data }) =>
      deleteClassTaskForManager(adminClient, actor.userId, actor, data),
    revalidate: (result, data) => {
      revalidatePath(getManagerClassDetailRoute(result.classId));
      revalidatePath(`/teacher/classes/${result.classId}`);
      revalidatePath(getManagerClassTaskDetailRoute(result.classId, data.id));
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
          "task_deleted"
        )
      );
    },
  });
}

export async function setClassTaskStartedAction(
  _prevState: SetClassTaskStartedActionState,
  formData: FormData
): Promise<SetClassTaskStartedActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();
  const startedRaw = String(formData.get("started") ?? "").trim();

  if (!id || !class_id) {
    return {
      success: false,
      error: "Task not found.",
    };
  }

  if (startedRaw !== "true" && startedRaw !== "false") {
    return {
      success: false,
      error: "Start state is required.",
    };
  }

  return runManagerMutation({
    data: { id, class_id, started: startedRaw === "true" },
    mutate: ({ adminClient, actor, data }) =>
      setClassTaskStartedForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getManagerClassDetailRoute(data.class_id));
      revalidatePath(getManagerClassTaskDetailRoute(data.class_id, data.id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
    }),
  });
}

export async function importSubjectTasksForClassAction(
  _prevState: ImportSubjectTasksActionState,
  formData: FormData
): Promise<ImportSubjectTasksActionState> {
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!class_id) {
    return {
      success: false,
      error: "Class not found.",
    };
  }

  return runManagerMutation({
    data: { class_id },
    mutate: ({ adminClient, actor, data }) =>
      importSubjectTasksForClassForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (_result, data) => {
      revalidatePath(getManagerClassDetailRoute(data.class_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      tasks: result.tasks,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
    }),
  });
}
