import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { processDropRefundSchema } from "@/lib/validators/manager/create-semester-drop";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { ManagerSemesterDropRequestRow } from "@/types/manager-semester-drop";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function mapDropRequest(
  row: NonNullable<
    ReturnType<
      typeof semesterDropRequestRepository.mapSemesterDropRequestRecord
    >
  >
): ManagerSemesterDropRequestRow {
  return {
    id: row.id,
    student_id: row.student_id,
    semester_id: row.semester_id,
    class_id: row.class_id,
    payment_phase_id: row.payment_phase_id,
    spp_id: row.spp_id,
    status: row.status,
    required_percent: row.required_percent,
    required_amount: row.required_amount,
    phase_amount_snapshot: row.phase_amount_snapshot,
    requested_at: row.requested_at,
    deadline_at: row.deadline_at,
    completed_at: row.completed_at,
    refund_owed: row.refund_owed,
    refund_status: row.refund_status,
    refunded_amount: row.refunded_amount,
    remaining_refund: Math.max(0, row.refund_owed - row.refunded_amount),
    requested_by: row.requested_by,
    notes: row.notes,
  };
}

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

  const remaining = Math.max(
    0,
    Number(existing.data.refund_owed) - Number(existing.data.refunded_amount)
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
    return {
      success: false,
      error: error.message || "Unable to record refund.",
    };
  }

  if (!data?.payment || !data.request) {
    return { success: false, error: "Unable to record refund." };
  }

  const mappedRequest =
    semesterDropRequestRepository.mapSemesterDropRequestRecord(data.request);
  if (!mappedRequest) {
    return { success: false, error: "Unable to load updated drop request." };
  }

  const request = mapDropRequest(mappedRequest);

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
