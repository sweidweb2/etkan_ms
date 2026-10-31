"use server";

import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import { ROUTES } from "@/lib/constants/routes";
import {
  parseProcessDropRefundFormData,
} from "@/lib/validators/manager/parse-semester-drop-form";
import {
  processDropRefundForManager,
} from "@/services/accounting/drop-refund.service";
import type { ProcessDropRefundActionState } from "@/types/manager-semester-drop";

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
      revalidatePath("/manager/income-statement");
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      request: result.request,
    }),
  });
}
