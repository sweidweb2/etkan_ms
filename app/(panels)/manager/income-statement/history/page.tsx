import { redirect } from "next/navigation";
import { IncomeStatementHistoryPanel } from "@/components/manager/accounting/income-statement-history-panel";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getIncomeStatementForManager,
  incomeStatementPeriodLabel,
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
  const months = await listIncomeStatementHistoryMonthsForManager(
    adminClient,
    user.id
  );

  const requested = parseIncomeStatementMonthKey(params.month);
  const requestedKey = requested
    ? `${requested.year}-${String(requested.month).padStart(2, "0")}`
    : null;
  const selected =
    months.find((month) => month.key === requestedKey) ?? months[0] ?? null;

  if (selected && selected.key !== requestedKey) {
    redirect(
      `${ROUTES.MANAGER_INCOME_STATEMENT_HISTORY}?month=${encodeURIComponent(selected.key)}`
    );
  }

  const data = selected
    ? await getIncomeStatementForManager(adminClient, user.id, {
        year: selected.year,
        month: selected.month,
      })
    : null;

  return (
    <IncomeStatementHistoryPanel
      months={months}
      selectedMonthKey={selected?.key ?? null}
      data={data}
      periodLabel={
        selected
          ? incomeStatementPeriodLabel({
              year: selected.year,
              month: selected.month,
            })
          : null
      }
    />
  );
}
