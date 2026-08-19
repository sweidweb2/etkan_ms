"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseCreateTransactionFormData,
  parseUpdateTransactionFormData,
} from "@/lib/validators/manager/create-transaction";
import {
  createTransactionForManager,
  updateTransactionForManager,
} from "@/services/accounting/transaction.service";
import type {
  CreateTransactionActionState,
  UpdateTransactionActionState,
} from "@/types/manager-income-statement";

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
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS);

  return {
    success: true,
    message: result.message,
  };
}

export async function updateTransactionAction(
  _prevState: UpdateTransactionActionState,
  formData: FormData
): Promise<UpdateTransactionActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateTransactionFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateTransactionForManager(
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
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS);

  return {
    success: true,
    message: result.message,
  };
}
