"use client";

import { useState } from "react";
import { AccountingExceptionTabs } from "@/components/manager/accounting/accounting-exception-tabs";
import { AssignMissingSppDialog } from "@/components/manager/accounting/assign-missing-spp-dialog";
import { DeleteDropRefundPaymentDialog } from "@/components/manager/accounting/delete-drop-refund-payment-dialog";
import { ProcessDropRefundDialog } from "@/components/manager/accounting/process-drop-refund-dialog";
import { ProcessedDropRefundsSidebar } from "@/components/manager/accounting/processed-drop-refunds-sidebar";
import { WaiveDropRefundDialog } from "@/components/manager/accounting/waive-drop-refund-dialog";
import type {
  ManagerBilledWithoutClassRow,
  ManagerMissingSppRow,
  ManagerPaymentPhaseRow,
  ManagerSppSemesterMismatchRow,
} from "@/types/manager-payment-phase";
import { SEMESTER_DROP_REFUND_STATUSES } from "@/lib/manager/accounting/constants";
import type {
  ManagerDropRefundPaymentRow,
  ManagerNeedRefundRow,
} from "@/types/manager-semester-drop";
import type { ManagerStudentWithoutActiveClassRow } from "@/types/manager-student";

type AccountingExceptionsClientProps = {
  phases: ManagerPaymentPhaseRow[];
  missing: ManagerMissingSppRow[];
  withoutClassOrPhase: ManagerStudentWithoutActiveClassRow[];
  billedWithoutClass: ManagerBilledWithoutClassRow[];
  sppSemesterMismatches: ManagerSppSemesterMismatchRow[];
  needRefund: ManagerNeedRefundRow[];
  processedRefundPayments: ManagerDropRefundPaymentRow[];
};

export function AccountingExceptionsClient({
  phases,
  missing: initialMissing,
  withoutClassOrPhase,
  billedWithoutClass,
  sppSemesterMismatches,
  needRefund: initialNeedRefund,
  processedRefundPayments: initialProcessedRefundPayments,
}: AccountingExceptionsClientProps) {
  const [assignRow, setAssignRow] = useState<ManagerMissingSppRow | null>(null);
  const [refundRow, setRefundRow] = useState<ManagerNeedRefundRow | null>(null);
  const [waiveRow, setWaiveRow] = useState<ManagerNeedRefundRow | null>(null);
  const [deletePaymentRow, setDeletePaymentRow] =
    useState<ManagerDropRefundPaymentRow | null>(null);
  const [missing, setMissing] = useState(initialMissing);
  const [prevMissing, setPrevMissing] = useState(initialMissing);
  const [needRefund, setNeedRefund] = useState(initialNeedRefund);
  const [prevNeedRefund, setPrevNeedRefund] = useState(initialNeedRefund);
  const [processedRefundPayments, setProcessedRefundPayments] = useState(
    initialProcessedRefundPayments
  );
  const [prevProcessedRefundPayments, setPrevProcessedRefundPayments] =
    useState(initialProcessedRefundPayments);

  if (initialMissing !== prevMissing) {
    setPrevMissing(initialMissing);
    setMissing(initialMissing);
  }
  if (initialNeedRefund !== prevNeedRefund) {
    setPrevNeedRefund(initialNeedRefund);
    setNeedRefund(initialNeedRefund);
  }
  if (initialProcessedRefundPayments !== prevProcessedRefundPayments) {
    setPrevProcessedRefundPayments(initialProcessedRefundPayments);
    setProcessedRefundPayments(initialProcessedRefundPayments);
  }

  return (
    <>
      <AssignMissingSppDialog
        open={assignRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAssignRow(null);
          }
        }}
        row={assignRow}
        phases={phases}
        onAssigned={() => {
          if (assignRow) {
            setMissing((current) =>
              current.filter((row) => row.student_id !== assignRow.student_id)
            );
          }
          setAssignRow(null);
        }}
      />
      <ProcessDropRefundDialog
        open={refundRow !== null}
        onOpenChange={(open) => {
          if (!open) setRefundRow(null);
        }}
        row={refundRow}
        onProcessed={(request) => {
          setNeedRefund((current) => {
            if (
              request.refund_status === SEMESTER_DROP_REFUND_STATUSES.PROCESSED ||
              request.remaining_refund <= 0
            ) {
              return current.filter((row) => row.id !== request.id);
            }
            return current.map((row) =>
              row.id === request.id
                ? {
                    ...row,
                    refund_owed: request.refund_owed,
                    refunded_amount: request.refunded_amount,
                    remaining_refund: request.remaining_refund,
                    refund_status: request.refund_status,
                  }
                : row
            );
          });
          setRefundRow(null);
        }}
      />
      <WaiveDropRefundDialog
        open={waiveRow !== null}
        onOpenChange={(open) => {
          if (!open) setWaiveRow(null);
        }}
        row={waiveRow}
        onWaived={(request) => {
          setNeedRefund((current) =>
            current.filter((row) => row.id !== request.id)
          );
          setWaiveRow(null);
        }}
      />
      <DeleteDropRefundPaymentDialog
        open={deletePaymentRow !== null}
        onOpenChange={(open) => {
          if (!open) setDeletePaymentRow(null);
        }}
        row={deletePaymentRow}
        onDeleted={(paymentId) => {
          setProcessedRefundPayments((current) =>
            current.filter((row) => row.id !== paymentId)
          );
          setDeletePaymentRow(null);
        }}
      />
      <div className="grid gap-4 @4xl/panel:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <AccountingExceptionTabs
          billedWithoutClass={billedWithoutClass}
          withoutClassOrPhase={withoutClassOrPhase}
          semesterMismatches={sppSemesterMismatches}
          missingSpp={missing}
          needRefund={needRefund}
          onAssignMissing={setAssignRow}
          onProcessRefund={setRefundRow}
          onWaiveRefund={setWaiveRow}
        />
        <ProcessedDropRefundsSidebar
          payments={processedRefundPayments}
          onDeletePayment={setDeletePaymentRow}
        />
      </div>
    </>
  );
}
