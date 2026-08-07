import { AccountingExceptionsClient } from "@/components/manager/accounting/accounting-exceptions-client";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listMissingSppForOpenedPhases,
  listSppSemesterMismatchForManager,
  listStudentsBilledWithoutActiveClassForManager,
} from "@/services/payment-phase.service";
import { listStudentsWithoutInProgressClassForManager } from "@/services/student.service";
import type { ManagerPaymentPhaseRow } from "@/types/manager-payment-phase";

type AccountingExceptionsSectionProps = {
  actorUserId: string | null;
  phases: ManagerPaymentPhaseRow[];
};

export async function AccountingExceptionsSection({
  actorUserId,
  phases,
}: AccountingExceptionsSectionProps) {
  const adminClient = createSupabaseAdminClient();

  const [
    missing,
    studentsWithoutActiveClass,
    sppSemesterMismatches,
    billedWithoutClass,
  ] = await Promise.all([
    listMissingSppForOpenedPhases(adminClient, actorUserId),
    listStudentsWithoutInProgressClassForManager(
      adminClient,
      actorUserId,
      PERMISSIONS.ACCOUNTING_VIEW
    ),
    listSppSemesterMismatchForManager(adminClient, actorUserId),
    listStudentsBilledWithoutActiveClassForManager(adminClient, actorUserId),
  ]);

  const billedStudentIds = new Set(
    billedWithoutClass.map((row) => row.student_id)
  );
  const withoutClassOrPhase = studentsWithoutActiveClass.filter(
    (row) => !billedStudentIds.has(row.user_id)
  );

  return (
    <AccountingExceptionsClient
      phases={phases}
      missing={missing}
      withoutClassOrPhase={withoutClassOrPhase}
      billedWithoutClass={billedWithoutClass}
      sppSemesterMismatches={sppSemesterMismatches}
    />
  );
}

export function AccountingExceptionsFallback() {
  return (
    <div
      className="min-h-[8rem] animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10"
      aria-hidden
    />
  );
}
