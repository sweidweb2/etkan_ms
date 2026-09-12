import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_VALUES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_VALUES,
  getTransactionCategoriesForType,
  type PaymentMethod,
  type TransactionType,
} from "@/lib/manager/accounting/constants";
import * as transactionRepository from "@/repositories/transaction.repository";
import * as workshopPaymentRepository from "@/repositories/workshop-payment.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerIncomeTransactionRow } from "@/types/manager-income-statement";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

function isTransactionType(value: string): value is TransactionType {
  return (TRANSACTION_TYPE_VALUES as readonly string[]).includes(value);
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHOD_VALUES as readonly string[]).includes(value);
}

function mapTransactionRow(
  row: transactionRepository.TransactionRecord,
  linkedWorkshopPaymentId: string | null = null
): ManagerIncomeTransactionRow {
  return {
    id: row.id,
    transaction_date: row.transaction_date,
    type: isTransactionType(row.type) ? row.type : TRANSACTION_TYPES.CREDIT,
    amount: Number(row.amount),
    description: row.description,
    category: row.category,
    payment_method:
      row.payment_method && isPaymentMethod(row.payment_method)
        ? row.payment_method
        : null,
    recorded_by: row.recorded_by,
    notes: row.notes,
    linked_workshop_payment_id: linkedWorkshopPaymentId,
  };
}

export const WORKSHOP_LINKED_TRANSACTION_EDIT_ERROR =
  "This transaction is linked to a workshop payment. Edit it from Workshops.";

export type CreateTransactionResult =
  | {
      success: true;
      transaction: ManagerIncomeTransactionRow;
      message: string;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: FieldErrors;
    };

export async function createTransactionForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    transaction_date: string;
    type: string;
    amount: number;
    description: string;
    category: string;
    payment_method?: string | null;
    recorded_by: string;
    notes?: string | null;
  }
): Promise<CreateTransactionResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_TRANSACTIONS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!isTransactionType(input.type)) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { type: ["Select credit or debit."] },
    };
  }

  const amount = Number(input.amount);
  const category = input.category?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const recordedBy = input.recorded_by?.trim() ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transaction_date ?? "")) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { transaction_date: ["Date must be YYYY-MM-DD."] },
    };
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { amount: ["Amount must be greater than zero."] },
    };
  }
  if (!description) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { description: ["Description is required."] },
    };
  }
  if (!category) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { category: ["Category is required."] },
    };
  }
  if (!recordedBy) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { recorded_by: ["Recorded by is required."] },
    };
  }

  // Preset categories must match type; custom (other) labels are free text.
  const presets = getTransactionCategoriesForType(input.type) as readonly string[];
  const isPreset = presets.includes(category);
  if (isPreset && category === "other") {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { category_custom: ["Enter a custom category."] },
    };
  }

  const paymentMethod =
    input.payment_method && isPaymentMethod(input.payment_method)
      ? input.payment_method
      : null;

  const { data: created, error } = await transactionRepository.createTransaction(
    adminClient,
    {
      transaction_date: input.transaction_date,
      type: input.type,
      amount,
      description,
      category,
      payment_method: paymentMethod,
      recorded_by: recordedBy,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    }
  );

  if (error || !created) {
    return {
      success: false,
      error: error?.message ?? "Unable to record transaction.",
    };
  }

  const transaction = mapTransactionRow(
    created as transactionRepository.TransactionRecord
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "transactions",
    record_id: transaction.id,
    new_data: {
      transaction_date: transaction.transaction_date,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      payment_method: transaction.payment_method ?? PAYMENT_METHODS.OTHER,
    },
    metadata: { note: "External transaction recorded." },
  });

  return {
    success: true,
    transaction,
    message:
      transaction.type === TRANSACTION_TYPES.CREDIT
        ? "Credit recorded."
        : "Debit recorded.",
  };
}

export type UpdateTransactionResult =
  | {
      success: true;
      transaction: ManagerIncomeTransactionRow;
      message: string;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: FieldErrors;
    };

export async function updateTransactionForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    transaction_date: string;
    type: string;
    amount: number;
    description: string;
    category: string;
    payment_method?: string | null;
    recorded_by: string;
    notes?: string | null;
  }
): Promise<UpdateTransactionResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_TRANSACTIONS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existingResult = await transactionRepository.findTransactionById(
    adminClient,
    input.id
  );
  if (existingResult.error) {
    return { success: false, error: existingResult.error.message };
  }
  if (!existingResult.data) {
    return { success: false, error: "Transaction not found." };
  }

  const existing = mapTransactionRow(
    existingResult.data as transactionRepository.TransactionRecord
  );

  const linkedPayment =
    await workshopPaymentRepository.findWorkshopPaymentByTransactionId(
      adminClient,
      input.id
    );
  if (linkedPayment.error) {
    return { success: false, error: linkedPayment.error.message };
  }
  if (linkedPayment.data) {
    return { success: false, error: WORKSHOP_LINKED_TRANSACTION_EDIT_ERROR };
  }

  if (!isTransactionType(input.type)) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { type: ["Select credit or debit."] },
    };
  }

  const amount = Number(input.amount);
  const category = input.category?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const recordedBy = input.recorded_by?.trim() ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transaction_date ?? "")) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { transaction_date: ["Date must be YYYY-MM-DD."] },
    };
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { amount: ["Amount must be greater than zero."] },
    };
  }
  if (!description) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { description: ["Description is required."] },
    };
  }
  if (!category) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { category: ["Category is required."] },
    };
  }
  if (!recordedBy) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { recorded_by: ["Recorded by is required."] },
    };
  }

  const presets = getTransactionCategoriesForType(input.type) as readonly string[];
  const isPreset = presets.includes(category);
  if (isPreset && category === "other") {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { category_custom: ["Enter a custom category."] },
    };
  }

  const paymentMethod =
    input.payment_method && isPaymentMethod(input.payment_method)
      ? input.payment_method
      : null;

  const { data: updated, error } = await transactionRepository.updateTransaction(
    adminClient,
    input.id,
    {
      transaction_date: input.transaction_date,
      type: input.type,
      amount,
      description,
      category,
      payment_method: paymentMethod,
      recorded_by: recordedBy,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    }
  );

  if (error || !updated) {
    return {
      success: false,
      error: error?.message ?? "Unable to update transaction.",
    };
  }

  const transaction = mapTransactionRow(
    updated as transactionRepository.TransactionRecord
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "transactions",
    record_id: transaction.id,
    old_data: {
      transaction_date: existing.transaction_date,
      type: existing.type,
      amount: existing.amount,
      description: existing.description,
      category: existing.category,
      payment_method: existing.payment_method ?? PAYMENT_METHODS.OTHER,
      recorded_by: existing.recorded_by,
      notes: existing.notes,
    },
    new_data: {
      transaction_date: transaction.transaction_date,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      payment_method: transaction.payment_method ?? PAYMENT_METHODS.OTHER,
      recorded_by: transaction.recorded_by,
      notes: transaction.notes,
    },
    metadata: { note: "External transaction updated." },
  });

  return {
    success: true,
    transaction,
    message: "Transaction updated.",
  };
}
