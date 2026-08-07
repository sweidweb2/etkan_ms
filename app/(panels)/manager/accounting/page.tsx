import { Suspense } from "react";
import {
  AccountingExceptionsFallback,
  AccountingExceptionsSection,
} from "@/components/manager/accounting/accounting-exceptions-section";
import { ManageAccountingPanel } from "@/components/manager/accounting/manage-accounting-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listPaymentPhasesForManager } from "@/services/payment-phase.service";

export default async function ManagerAccountingPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const phases = await listPaymentPhasesForManager(adminClient, actorUserId);

  return (
    <div className="flex flex-col gap-6">
      <ManageAccountingPanel initialPhases={phases} />
      <Suspense fallback={<AccountingExceptionsFallback />}>
        <AccountingExceptionsSection
          actorUserId={actorUserId}
          phases={phases}
        />
      </Suspense>
    </div>
  );
}
