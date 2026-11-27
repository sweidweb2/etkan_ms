"use server";

import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import { ROUTES } from "@/lib/constants/routes";
import {
  parseDeleteDropRefundPaymentFormData,
  parseProcessDropRefundFormData,
  parseWaiveDropRefundFormData,
} from "@/lib/validators/manager/parse-semester-drop-form";
import {
  deleteDropRefundPaymentForManager,
  processDropRefundForManager,
  waiveDropRefundForManager,
} from "@/services/accounting/drop-refund.service";
import type {
  DeleteDropRefundPaymentActionState,
  ProcessDropRefundActionState,
  WaiveDropRefundActionState,
} from "@/types/manager-semester-drop";

export async function processDropRefundAction(
  _prevState: ProcessDropRefundActionState,
  formData: FormData
): Promise<ProcessDropRefundActionState> {
  return runManagerAction({
    formData,
    parse: parseProcessDropRefundFormData,
    mutate: ({ adminClient, actor, data }) =>
      processDropRefundForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_ACCOUNTING);
      revalidatePath(ROUTES.MANAGER_STUDENTS_DROP);
      revalidatePath("/manager/income-statement");
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      request: result.request,
    }),
  });
}

export async function waiveDropRefundAction(
  _prevState: WaiveDropRefundActionState,
  formData: FormData
): Promise<WaiveDropRefundActionState> {
  return runManagerAction({
    formData,
    parse: parseWaiveDropRefundFormData,
    mutate: ({ adminClient, actor, data }) =>
      waiveDropRefundForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_ACCOUNTING);
      revalidatePath(ROUTES.MANAGER_STUDENTS_DROP);
      revalidatePath("/manager/income-statement");
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      request: result.request,
    }),
  });
}

export async function deleteDropRefundPaymentAction(
  _prevState: DeleteDropRefundPaymentActionState,
  formData: FormData
): Promise<DeleteDropRefundPaymentActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteDropRefundPaymentFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteDropRefundPaymentForManager(adminClient, actor.userId, actor, {
        payment_id: data.payment_id,
      }),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_ACCOUNTING);
      revalidatePath(ROUTES.MANAGER_STUDENTS_DROP);
      revalidatePath("/manager/income-statement");
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      deletedPaymentId: result.deletedPaymentId,
    }),
  });
}
