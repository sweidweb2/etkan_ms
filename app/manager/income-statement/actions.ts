"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateTransactionFormData } from "@/lib/validators/manager/create-transaction";
import { createTransactionForManager } from "@/services/transaction.service";
import type { CreateTransactionActionState } from "@/types/manager-income-statement";

export async function createTransactionAction(
  _prevState: CreateTransactionActionState,
  formData: FormData
): Promise<CreateTransactionActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateTransactionFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createTransactionForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT);

  return {
    success: true,
    message: result.message,
  };
}
