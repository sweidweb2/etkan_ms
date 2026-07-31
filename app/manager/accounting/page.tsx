import { ManageAccountingPanel } from "@/components/manager/accounting/manage-accounting-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listMissingSppForOpenedPhases,
  listPaymentPhaseSemesterOptionsForManager,
  listPaymentPhasesForManager,
} from "@/services/payment-phase.service";

export default async function ManagerAccountingPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const [phases, missing, semesterOptions] = await Promise.all([
    listPaymentPhasesForManager(adminClient, actorUserId),
    listMissingSppForOpenedPhases(adminClient, actorUserId),
    listPaymentPhaseSemesterOptionsForManager(adminClient, actorUserId),
  ]);

  return (
    <ManageAccountingPanel
      initialPhases={phases}
      initialMissing={missing}
      semesterOptions={semesterOptions}
    />
  );
}
