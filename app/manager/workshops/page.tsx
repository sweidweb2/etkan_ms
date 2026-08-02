import { ManageWorkshopsPanel } from "@/components/manager/workshops/manage-workshops-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listAllWorkshopPaymentsForManager,
  listWorkshopsForManager,
} from "@/services/workshop.service";

export default async function ManagerWorkshopsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const [workshops, paymentsPage] = await Promise.all([
    listWorkshopsForManager(adminClient, actorUserId),
    listAllWorkshopPaymentsForManager(adminClient, actorUserId),
  ]);

  return (
    <ManageWorkshopsPanel
      initialWorkshops={workshops}
      payments={paymentsPage.payments}
      paymentTotals={paymentsPage.totals}
    />
  );
}
