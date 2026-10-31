"use client";

import { useState } from "react";
import { AccountingExceptionTabs } from "@/components/manager/accounting/accounting-exception-tabs";
import { AssignMissingSppDialog } from "@/components/manager/accounting/assign-missing-spp-dialog";
import { ProcessDropRefundDialog } from "@/components/manager/accounting/process-drop-refund-dialog";
import type {
  ManagerBilledWithoutClassRow,
  ManagerMissingSppRow,
  ManagerPaymentPhaseRow,
  ManagerSppSemesterMismatchRow,
} from "@/types/manager-payment-phase";
import type { ManagerNeedRefundRow } from "@/types/manager-semester-drop";
import type { ManagerStudentWithoutActiveClassRow } from "@/types/manager-student";

type AccountingExceptionsClientProps = {
  phases: ManagerPaymentPhaseRow[];
  missing: ManagerMissingSppRow[];
  withoutClassOrPhase: ManagerStudentWithoutActiveClassRow[];
  billedWithoutClass: ManagerBilledWithoutClassRow[];
  sppSemesterMismatches: ManagerSppSemesterMismatchRow[];
  needRefund: ManagerNeedRefundRow[];
};

export function AccountingExceptionsClient({
  phases,
  missing: initialMissing,
  withoutClassOrPhase,
  billedWithoutClass,
  sppSemesterMismatches,
  needRefund: initialNeedRefund,
}: AccountingExceptionsClientProps) {
  const [assignRow, setAssignRow] = useState<ManagerMissingSppRow | null>(null);
  const [refundRow, setRefundRow] = useState<ManagerNeedRefundRow | null>(null);
  const [missing, setMissing] = useState(initialMissing);
  const [prevMissing, setPrevMissing] = useState(initialMissing);
  const [needRefund, setNeedRefund] = useState(initialNeedRefund);
  const [prevNeedRefund, setPrevNeedRefund] = useState(initialNeedRefund);

  if (initialMissing !== prevMissing) {
    setPrevMissing(initialMissing);
    setMissing(initialMissing);
  }
  if (initialNeedRefund !== prevNeedRefund) {
    setPrevNeedRefund(initialNeedRefund);
    setNeedRefund(initialNeedRefund);
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
        onProcessed={() => {
          setRefundRow(null);
        }}
      />
      <AccountingExceptionTabs
        billedWithoutClass={billedWithoutClass}
        withoutClassOrPhase={withoutClassOrPhase}
        semesterMismatches={sppSemesterMismatches}
        missingSpp={missing}
        needRefund={needRefund}
        onAssignMissing={setAssignRow}
        onProcessRefund={setRefundRow}
      />
    </>
  );
}
