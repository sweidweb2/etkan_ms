import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  remainingDropRefund,
  toManagerSemesterDropRow,
} from "@/lib/manager/accounting/semester-drop-mapper";
import { DROP_REFUND_AMOUNT_SQL_MESSAGE } from "@/lib/manager/accounting/semester-drop-messages";
import {
  processDropRefundSchema,
  waiveDropRefundSchema,
} from "@/lib/validators/manager/create-semester-drop";
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

export type WaiveDropRefundResult =
  | {
      success: true;
      request: ManagerSemesterDropRequestRow;
      message: string;
    }
  | MutationFailure;

export type DeleteDropRefundPaymentResult =
  | {
      success: true;
      deletedPaymentId: string;
      message: string;
    }
  | MutationFailure;

export async function waiveDropRefundForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { request_id: string }
): Promise<WaiveDropRefundResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_DROP_REFUNDS_WAIVE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = waiveDropRefundSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data, error } =
    await semesterDropRequestRepository.waiveSemesterDropRefund(
      adminClient,
      parsed.data.request_id
    );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to waive drop refund.",
    };
  }

  if (!data?.request) {
    return { success: false, error: "Unable to waive drop refund." };
  }

  const request = toManagerSemesterDropRow(data.request);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "semester_drop_requests",
    record_id: request.id,
    new_data: {
      refund_status: request.refund_status,
      refund_owed: request.refund_owed,
      refunded_amount: request.refunded_amount,
    },
    metadata: {
      note: "Drop semester refund waived (no debit). Overpayment kept.",
    },
  });

  return {
    success: true,
    request,
    message: "Drop refund waived. Student keeps the overpayment; drop stays completed.",
  };
}

/**
 * Delete a processed drop-refund debit so it no longer affects payment stats.
 * Syncs the drop request (clears owed when fully wiped; does not recreate Need refund
 * when refunded_amount hits 0 — status becomes none).
 */
export async function deleteDropRefundPaymentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { payment_id: string }
): Promise<DeleteDropRefundPaymentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const paymentId =
    typeof input.payment_id === "string" ? input.payment_id.trim() : "";
  if (!paymentId) {
    return { success: false, error: "Payment is required." };
  }

  const existing = await studentPaymentRepository.findPaymentById(
    adminClient,
    paymentId
  );
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Payment not found." };
  }
  if (existing.data.type !== "debit" || !existing.data.semester_drop_request_id) {
    return {
      success: false,
      error: "Only processed drop refund debit payments can be deleted here.",
    };
  }

  const dropRequestId = existing.data.semester_drop_request_id;
  const amount = Number(existing.data.amount) || 0;

  const { data, error } =
    await studentPaymentRepository.deleteStudentPaymentWithRecalc(
      adminClient,
      paymentId,
      existing.data.student_payment_phase_id
    );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to delete refund payment.",
    };
  }
  if (!data?.deleted) {
    return { success: false, error: "Unable to delete refund payment." };
  }

  const sync = await semesterDropRequestRepository.syncDropRefundAfterDebitDelete(
    adminClient,
    dropRequestId,
    amount
  );
  if (sync.error) {
    return {
      success: false,
      error: sync.error.message || "Payment deleted but drop refund sync failed.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_payments",
    record_id: paymentId,
    old_data: {
      type: "debit",
      amount,
      semester_drop_request_id: dropRequestId,
    },
    metadata: {
      note: "Drop refund debit deleted; removed from payment stats.",
    },
  });

  return {
    success: true,
    deletedPaymentId: paymentId,
    message: "Refund payment deleted. It no longer affects payment stats.",
  };
}
