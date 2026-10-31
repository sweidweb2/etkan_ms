import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  remainingDropRefund,
  toManagerSemesterDropRow,
} from "@/lib/manager/accounting/semester-drop-mapper";
import { DROP_REFUND_AMOUNT_SQL_MESSAGE } from "@/lib/manager/accounting/semester-drop-messages";
import { processDropRefundSchema } from "@/lib/validators/manager/create-semester-drop";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { MutationFailure, Supabase } from "@/services/shared/mutation";
import type { ManagerSemesterDropRequestRow } from "@/types/manager-semester-drop";

export type ProcessDropRefundResult =
  | {
      success: true;
      request: ManagerSemesterDropRequestRow;
      payment_id: string;
      message: string;
    }
  | MutationFailure;

export async function processDropRefundForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    request_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    received_by: string;
    received_by_management?: boolean;
    notes?: string | null;
  }
): Promise<ProcessDropRefundResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_DROP_REFUNDS_PROCESS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = processDropRefundSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await semesterDropRequestRepository.findDropRequestById(
    adminClient,
    parsed.data.request_id
  );
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Drop request not found." };
  }

  // Fast field-level check; SQL re-validates under row lock.
  const remaining = remainingDropRefund(
    Number(existing.data.refund_owed),
    Number(existing.data.refunded_amount)
  );
  if (parsed.data.amount > remaining) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: [`Amount cannot exceed remaining refund (${remaining}).`],
      },
    };
  }

  const { data, error } =
    await studentPaymentRepository.createDropRefundDebitWithRecalc(
      adminClient,
      {
        drop_request_id: parsed.data.request_id,
        amount: parsed.data.amount,
        payment_date: parsed.data.payment_date,
        payment_method: parsed.data.payment_method,
        received_by: parsed.data.received_by.trim(),
        received_by_management: parsed.data.received_by_management ?? false,
        notes: parsed.data.notes?.trim() || null,
      }
    );

  if (error) {
    const message = error.message || "Unable to record refund.";
    if (message.includes(DROP_REFUND_AMOUNT_SQL_MESSAGE)) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { amount: [message] },
      };
    }
    return { success: false, error: message };
  }

  if (!data?.payment || !data.request) {
    return { success: false, error: "Unable to record refund." };
  }

  const mappedRequest =
    semesterDropRequestRepository.mapSemesterDropRequestRecord(data.request);
  if (!mappedRequest) {
    return { success: false, error: "Unable to load updated drop request." };
  }

  const request = toManagerSemesterDropRow(mappedRequest);

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_payments",
    record_id: data.payment.id,
    new_data: {
      type: "debit",
      amount: data.payment.amount,
      semester_drop_request_id: parsed.data.request_id,
    },
    metadata: { note: "Drop semester refund debit recorded." },
  });

  return {
    success: true,
    request,
    payment_id: data.payment.id,
    message:
      request.refund_status === "processed"
        ? "Refund recorded. Drop refund fully processed."
        : "Partial refund recorded.",
  };
}
