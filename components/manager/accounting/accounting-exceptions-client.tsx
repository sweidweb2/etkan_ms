"use client";

import { useState } from "react";
import { AccountingExceptionTabs } from "@/components/manager/accounting/accounting-exception-tabs";
import { AssignMissingSppDialog } from "@/components/manager/accounting/assign-missing-spp-dialog";
import type {
  ManagerBilledWithoutClassRow,
  ManagerMissingSppRow,
  ManagerPaymentPhaseRow,
  ManagerSppSemesterMismatchRow,
} from "@/types/manager-payment-phase";
import type { ManagerStudentWithoutActiveClassRow } from "@/types/manager-student";

type AccountingExceptionsClientProps = {
  phases: ManagerPaymentPhaseRow[];
  missing: ManagerMissingSppRow[];
  withoutClassOrPhase: ManagerStudentWithoutActiveClassRow[];
  billedWithoutClass: ManagerBilledWithoutClassRow[];
  sppSemesterMismatches: ManagerSppSemesterMismatchRow[];
};

export function AccountingExceptionsClient({
  phases,
  missing: initialMissing,
  withoutClassOrPhase,
  billedWithoutClass,
  sppSemesterMismatches,
}: AccountingExceptionsClientProps) {
  const [assignRow, setAssignRow] = useState<ManagerMissingSppRow | null>(null);
  const [missing, setMissing] = useState(initialMissing);
  const [prevMissing, setPrevMissing] = useState(initialMissing);

  if (initialMissing !== prevMissing) {
    setPrevMissing(initialMissing);
    setMissing(initialMissing);
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
      <AccountingExceptionTabs
        billedWithoutClass={billedWithoutClass}
        withoutClassOrPhase={withoutClassOrPhase}
        semesterMismatches={sppSemesterMismatches}
        missingSpp={missing}
        onAssignMissing={setAssignRow}
      />
    </>
  );
}
