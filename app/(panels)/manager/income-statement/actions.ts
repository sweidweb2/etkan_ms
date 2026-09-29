"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseCreateTransactionFormData,
  parseDeleteTransactionFormData,
  parseUpdateTransactionFormData,
} from "@/lib/validators/manager/create-transaction";
import {
  createTransactionForManager,
  deleteTransactionForManager,
  updateTransactionForManager,
} from "@/services/accounting/transaction.service";
import type {
  CreateTransactionActionState,
  DeleteTransactionActionState,
  UpdateTransactionActionState,
} from "@/types/manager-income-statement";

function revalidateIncomeStatementPaths() {
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT);
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS);
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_HISTORY);
}

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

  revalidateIncomeStatementPaths();

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

  revalidateIncomeStatementPaths();

  return {
    success: true,
    message: result.message,
  };
}

export async function deleteTransactionAction(
  _prevState: DeleteTransactionActionState,
  formData: FormData
): Promise<DeleteTransactionActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseDeleteTransactionFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteTransactionForManager(
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

  revalidateIncomeStatementPaths();

  return {
    success: true,
    message: result.message,
  };
}
