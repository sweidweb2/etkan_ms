import { WorkshopPaymentsOverviewPanel } from "@/components/manager/workshops/workshop-payments-overview-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkshopPaymentsOverviewForManager } from "@/services/workshops/workshop.service";

type ManagerWorkshopsPaymentsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ManagerWorkshopsPaymentsPage({
  searchParams,
}: ManagerWorkshopsPaymentsPageProps) {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const paymentsPage = await getWorkshopPaymentsOverviewForManager(
    adminClient,
    user?.id ?? null,
    { page, pageSize: 10 }
  );

  return (
    <WorkshopPaymentsOverviewPanel
      payments={paymentsPage.payments}
      totals={paymentsPage.totals}
      totalCount={paymentsPage.totalCount}
      page={paymentsPage.page}
      pageSize={paymentsPage.pageSize}
    />
  );
}
