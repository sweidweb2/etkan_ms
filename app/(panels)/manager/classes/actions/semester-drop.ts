"use server";

import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import { getManagerClassDetailRoute } from "@/lib/constants/routes";
import {
  parseCancelSemesterDropFormData,
  parseCreateSemesterDropFormData,
} from "@/lib/validators/manager/parse-semester-drop-form";
import {
  cancelSemesterDropForManager,
  createSemesterDropForManager,
} from "@/services/classes/drop-semester.service";
import type {
  CancelSemesterDropActionState,
  CreateSemesterDropActionState,
} from "@/types/manager-semester-drop";

export async function createSemesterDropAction(
  _prevState: CreateSemesterDropActionState,
  formData: FormData
): Promise<CreateSemesterDropActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateSemesterDropFormData,
    mutate: ({ adminClient, actor, data }) =>
      createSemesterDropForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getManagerClassDetailRoute(data.class_id));
      revalidatePath("/manager/accounting");
    },
    mapSuccess: (result, data) => ({
      success: true,
      message: result.message,
      completedImmediately: result.completedImmediately,
      membershipId: data.membership_id,
      removedStudentMembershipId: result.removedFromClass
        ? data.membership_id
        : undefined,
      requestId: result.request?.id,
    }),
  });
}

export async function cancelSemesterDropAction(
  _prevState: CancelSemesterDropActionState,
  formData: FormData
): Promise<CancelSemesterDropActionState> {
  return runManagerAction({
    formData,
    parse: parseCancelSemesterDropFormData,
    mutate: ({ adminClient, actor, data }) =>
      cancelSemesterDropForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getManagerClassDetailRoute(data.class_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}
