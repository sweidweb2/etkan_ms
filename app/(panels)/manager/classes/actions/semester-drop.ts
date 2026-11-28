"use server";
import { PERMISSIONS } from "@/lib/constants/permissions";

import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import {
  getManagerClassDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
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
    permission: PERMISSIONS.CLASSES_DROP_SEMESTER,
    formData,
    parse: parseCreateSemesterDropFormData,
    mutate: ({ adminClient, actor, data }) =>
      createSemesterDropForManager(adminClient, actor.userId, actor, {
        ...data,
        auditSource:
          formData.get("audit_source") === "drop_student_console"
            ? "drop_student_console"
            : undefined,
      }),
    revalidate: (_result, data) => {
      revalidatePath(getManagerClassDetailRoute(data.class_id));
      revalidatePath(ROUTES.MANAGER_ACCOUNTING);
      revalidatePath(ROUTES.MANAGER_STUDENTS_DROP);
    },
    mapSuccess: (result, data) => ({
      success: true,
      message: result.message,
      completedImmediately: result.completedImmediately,
      membershipId: data.membership_id,
      removedStudentMembershipId: result.removedFromClass
        ? data.membership_id
        : undefined,
      removedMembershipIds: result.removedFromClass
        ? result.removedMembershipIds.length > 0
          ? result.removedMembershipIds
          : data.membership_id
            ? [data.membership_id]
            : []
        : [],
      requestId: result.request?.id,
    }),
  });
}

export async function cancelSemesterDropAction(
  _prevState: CancelSemesterDropActionState,
  formData: FormData
): Promise<CancelSemesterDropActionState> {
  return runManagerAction({
    permission: PERMISSIONS.CLASSES_DROP_SEMESTER,
    formData,
    parse: parseCancelSemesterDropFormData,
    mutate: ({ adminClient, actor, data }) =>
      cancelSemesterDropForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getManagerClassDetailRoute(data.class_id));
      revalidatePath(ROUTES.MANAGER_STUDENTS_DROP);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}
