import { redirect } from "next/navigation";
import { IncomeStatementAnalyticsPanel } from "@/components/manager/accounting/income-statement-analytics-panel";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getIncomeStatementAnalyticsForManager } from "@/services/income-statement-analytics.service";

type ManagerIncomeStatementAnalyticsPageProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

function parseYear(value: string | undefined): number | null {
  if (!value) return null;
  const year = Number(value);
  return Number.isFinite(year) ? year : null;
}

function parseMonth(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === "all") return null;
  const month = Number(value);
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return undefined;
  }
  return month;
}

export default async function ManagerIncomeStatementAnalyticsPage({
  searchParams,
}: ManagerIncomeStatementAnalyticsPageProps) {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const params = await searchParams;
  const year = parseYear(params.year);
  const month = parseMonth(params.month);

  const data = await getIncomeStatementAnalyticsForManager(
    adminClient,
    user.id,
    {
      year,
      month,
    }
  );

  return <IncomeStatementAnalyticsPanel data={data} />;
}
