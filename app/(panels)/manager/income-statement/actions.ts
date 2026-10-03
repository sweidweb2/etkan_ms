"use server";

import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import { ROUTES } from "@/lib/constants/routes";
import {
  parseCreateTransactionFormData,
  parseDeleteTransactionFormData,
  parseUpdateTransactionFormData,
} from "@/lib/validators/manager/transaction";
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

/** Live + analytics only — history month discovery is expensive; leave it until visited. */
function revalidateIncomeStatementPaths() {
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT);
  revalidatePath(ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS);
}

export async function createTransactionAction(
  _prevState: CreateTransactionActionState,
  formData: FormData
): Promise<CreateTransactionActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateTransactionFormData,
    mutate: ({ adminClient, actor, data }) =>
      createTransactionForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidateIncomeStatementPaths();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function updateTransactionAction(
  _prevState: UpdateTransactionActionState,
  formData: FormData
): Promise<UpdateTransactionActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateTransactionFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateTransactionForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidateIncomeStatementPaths();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function deleteTransactionAction(
  _prevState: DeleteTransactionActionState,
  formData: FormData
): Promise<DeleteTransactionActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteTransactionFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteTransactionForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidateIncomeStatementPaths();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}
