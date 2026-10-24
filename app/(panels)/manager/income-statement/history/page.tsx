import { Suspense } from "react";
import { redirect } from "next/navigation";
import { IncomeStatementHistoryPanel } from "@/components/manager/accounting/income-statement-history-panel";
import {
  IncomeStatementHistoryMonthSelectFallback,
  IncomeStatementHistoryMonthSelectSection,
  IncomeStatementHistoryStatementFallback,
  IncomeStatementHistoryStatementSection,
} from "@/components/manager/accounting/income-statement-history-sections";
import { IncomeStatementHistoryMonthSelect } from "@/components/manager/accounting/income-statement-history-month-select";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getIncomeStatementForManager,
  incomeStatementPeriodKey,
  listIncomeStatementHistoryMonthsForManager,
  parseIncomeStatementMonthKey,
} from "@/services/accounting/income-statement.service";

type ManagerIncomeStatementHistoryPageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function ManagerIncomeStatementHistoryPage({
  searchParams,
}: ManagerIncomeStatementHistoryPageProps) {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const params = await searchParams;
  const requested = parseIncomeStatementMonthKey(params.month);

  // Month list is cheap-ish and starts immediately; it is only awaited inside
  // Suspense so the shell (title, breadcrumb) paints first.
  const monthsPromise = listIncomeStatementHistoryMonthsForManager(
    adminClient,
    user.id
  );
  // Avoid unhandled-rejection noise if a section never awaits it (redirect paths).
  monthsPromise.catch(() => undefined);

  // No (valid) month in the URL: we must know the newest month to redirect.
  if (!requested) {
    const months = await monthsPromise;

    if (months[0]) {
      redirect(
        `${ROUTES.MANAGER_INCOME_STATEMENT_HISTORY}?month=${encodeURIComponent(months[0].key)}`
      );
    }

    return (
      <IncomeStatementHistoryPanel
        monthSelectSlot={
          <IncomeStatementHistoryMonthSelect
            months={months}
            selectedMonthKey={null}
          />
        }
        statementSlot={null}
      />
    );
  }

  // Valid month: start the statement in parallel with the month list.
  const statementPromise = getIncomeStatementForManager(
    adminClient,
    user.id,
    requested
  );
  statementPromise.catch(() => undefined);

  return (
    <IncomeStatementHistoryPanel
      monthSelectSlot={
        <Suspense fallback={<IncomeStatementHistoryMonthSelectFallback />}>
          <IncomeStatementHistoryMonthSelectSection
            monthsPromise={monthsPromise}
            selectedMonthKey={incomeStatementPeriodKey(requested)}
          />
        </Suspense>
      }
      statementSlot={
        <Suspense fallback={<IncomeStatementHistoryStatementFallback />}>
          <IncomeStatementHistoryStatementSection
            monthsPromise={monthsPromise}
            statementPromise={statementPromise}
            period={requested}
          />
        </Suspense>
      }
    />
  );
}
