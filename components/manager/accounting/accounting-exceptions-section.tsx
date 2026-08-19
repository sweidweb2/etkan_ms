import { AccountingExceptionsClient } from "@/components/manager/accounting/accounting-exceptions-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAccountingExceptionsSnapshotForManager } from "@/services/accounting/payment-phase.service";
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
  const snapshot = await getAccountingExceptionsSnapshotForManager(
    adminClient,
    actorUserId,
    phases
  );

  return (
    <AccountingExceptionsClient
      phases={phases}
      missing={snapshot.missing}
      withoutClassOrPhase={snapshot.withoutClassOrPhase}
      billedWithoutClass={snapshot.billedWithoutClass}
      sppSemesterMismatches={snapshot.sppSemesterMismatches}
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
