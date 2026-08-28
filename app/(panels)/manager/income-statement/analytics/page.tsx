import { Suspense } from "react";
import { redirect } from "next/navigation";
import { IncomeStatementAnalyticsPanel } from "@/components/manager/accounting/income-statement-analytics-panel";
import { IncomeStatementAnalyticsTablesSection } from "@/components/manager/accounting/income-statement-analytics-tables-section";
import { IncomeStatementNextMonthSection } from "@/components/manager/accounting/income-statement-next-month-section";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getIncomeStatementAnalyticsSummaryForManager } from "@/services/accounting/income-statement-analytics.service";

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

  const summary = await getIncomeStatementAnalyticsSummaryForManager(
    adminClient,
    user.id,
    {
      year,
      month,
    }
  );

  return (
    <IncomeStatementAnalyticsPanel
      data={{
        ...summary,
        payments: [],
        transactions: [],
        unpaidStudents: [],
        adjustedStudents: [],
      }}
      forecastSlot={
        <Suspense
          fallback={
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-hidden
            >
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="min-h-[6.5rem] animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10"
                />
              ))}
            </div>
          }
        >
          <IncomeStatementNextMonthSection actorUserId={user.id} />
        </Suspense>
      }
      tablesSlot={
        <Suspense
          fallback={
            <div
              className="min-h-[12rem] animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10"
              aria-hidden
            />
          }
        >
          <IncomeStatementAnalyticsTablesSection
            actorUserId={user.id}
            year={summary.year}
            month={summary.month}
          />
        </Suspense>
      }
    />
  );
}
