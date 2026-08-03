import { WorkshopPaymentsOverviewPanel } from "@/components/manager/workshops/workshop-payments-overview-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listAllWorkshopPaymentsForManager } from "@/services/workshop.service";

export default async function ManagerWorkshopsPaymentsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const paymentsPage = await listAllWorkshopPaymentsForManager(
    adminClient,
    user?.id ?? null
  );

  return (
    <WorkshopPaymentsOverviewPanel
      payments={paymentsPage.payments}
      totals={paymentsPage.totals}
    />
  );
}
