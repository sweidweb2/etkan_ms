import { redirect } from "next/navigation";
import { IncomeStatementHistoryMonthSelect } from "@/components/manager/accounting/income-statement-history-month-select";
import { IncomeStatementPanel } from "@/components/manager/accounting/income-statement-panel";
import { ROUTES } from "@/lib/constants/routes";
import {
  incomeStatementPeriodKey,
  incomeStatementPeriodLabel,
} from "@/services/accounting/income-statement.service";
import type {
  IncomeStatementMonthOption,
  IncomeStatementPeriod,
  ManagerIncomeStatementData,
} from "@/types/manager-income-statement";

export function IncomeStatementHistoryMonthSelectFallback() {
  return (
    <div
      className="h-9 w-full animate-pulse rounded-lg bg-muted/40 ring-1 ring-foreground/10"
      aria-hidden
    />
  );
}

export function IncomeStatementHistoryStatementFallback() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="grid gap-4 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="min-h-[6.5rem] animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10"
          />
        ))}
      </div>
      <div className="min-h-[14rem] animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10" />
    </div>
  );
}

type MonthSelectSectionProps = {
  monthsPromise: Promise<IncomeStatementMonthOption[]>;
  selectedMonthKey: string | null;
};

/** Streams the month list; the statement is loading in parallel. */
export async function IncomeStatementHistoryMonthSelectSection({
  monthsPromise,
  selectedMonthKey,
}: MonthSelectSectionProps) {
  const months = await monthsPromise;

  return (
    <IncomeStatementHistoryMonthSelect
      months={months}
      selectedMonthKey={selectedMonthKey}
    />
  );
}

type StatementSectionProps = {
  monthsPromise: Promise<IncomeStatementMonthOption[]>;
  statementPromise: Promise<ManagerIncomeStatementData>;
  period: IncomeStatementPeriod;
};

/**
 * Streams the selected month's statement. The statement query was started in
 * parallel with the month list; the list is only used to validate the month.
 */
export async function IncomeStatementHistoryStatementSection({
  monthsPromise,
  statementPromise,
  period,
}: StatementSectionProps) {
  const [months, data] = await Promise.all([monthsPromise, statementPromise]);
  const key = incomeStatementPeriodKey(period);

  if (months.length === 0) {
    redirect(ROUTES.MANAGER_INCOME_STATEMENT_HISTORY);
  }

  if (!months.some((month) => month.key === key)) {
    redirect(
      `${ROUTES.MANAGER_INCOME_STATEMENT_HISTORY}?month=${encodeURIComponent(months[0].key)}`
    );
  }

  return (
    <IncomeStatementPanel
      data={data}
      periodLabel={incomeStatementPeriodLabel(period)}
      readOnly
    />
  );
}
