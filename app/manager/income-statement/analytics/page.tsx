import { redirect } from "next/navigation";
import { IncomeStatementAnalyticsPanel } from "@/components/manager/accounting/income-statement-analytics-panel";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getIncomeStatementAnalyticsForManager } from "@/services/income-statement-analytics.service";

type ManagerIncomeStatementAnalyticsPageProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

export default async function ManagerIncomeStatementAnalyticsPage({
  searchParams,
}: ManagerIncomeStatementAnalyticsPageProps) {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const params = await searchParams;
  const year = params.year ? Number(params.year) : null;
  const monthRaw = params.month ? Number(params.month) : null;
  const month =
    monthRaw !== null && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : null;

  const data = await getIncomeStatementAnalyticsForManager(
    adminClient,
    user.id,
    {
      year: Number.isFinite(year) ? year : null,
      month,
    }
  );

  return <IncomeStatementAnalyticsPanel data={data} />;
}
