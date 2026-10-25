import { MissingPriorAdjustmentClient } from "@/components/manager/accounting/missing-prior-adjustment-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listOpenSppsMissingPriorAdjustmentForManager } from "@/services/accounting/student-financial-adjustment.service";
import type { ManagerPaymentPhaseRow } from "@/types/manager-payment-phase";

type MissingPriorAdjustmentSectionProps = {
  actorUserId: string | null;
  phases: ManagerPaymentPhaseRow[];
};

export async function MissingPriorAdjustmentSection({
  actorUserId,
  phases,
}: MissingPriorAdjustmentSectionProps) {
  const adminClient = createSupabaseAdminClient();
  const rows = await listOpenSppsMissingPriorAdjustmentForManager(
    adminClient,
    actorUserId,
    phases
  );

  return <MissingPriorAdjustmentClient initialRows={rows} />;
}

export function MissingPriorAdjustmentFallback() {
  return (
    <div className="min-h-[8rem] animate-pulse rounded-lg bg-muted/40" aria-hidden />
  );
}
