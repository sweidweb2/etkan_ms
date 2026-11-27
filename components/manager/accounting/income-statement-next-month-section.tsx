import { IncomeStatementNextMonthCards } from "@/components/manager/accounting/income-statement-next-month-cards";
import { loadNextMonthIncomeForecastDeferredForManager } from "@/services/accounting/income-statement-analytics.service";

type IncomeStatementNextMonthSectionProps = {
  actorUserId: string;
};

export async function IncomeStatementNextMonthSection({
  actorUserId,
}: IncomeStatementNextMonthSectionProps) {
  const forecast =
    await loadNextMonthIncomeForecastDeferredForManager(actorUserId);

  return <IncomeStatementNextMonthCards forecast={forecast} />;
}
