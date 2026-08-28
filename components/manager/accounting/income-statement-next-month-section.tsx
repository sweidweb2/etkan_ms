import { IncomeStatementNextMonthCards } from "@/components/manager/accounting/income-statement-next-month-cards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getNextMonthIncomeForecastForManager } from "@/services/accounting/income-statement-analytics.service";

type IncomeStatementNextMonthSectionProps = {
  actorUserId: string;
};

export async function IncomeStatementNextMonthSection({
  actorUserId,
}: IncomeStatementNextMonthSectionProps) {
  const adminClient = createSupabaseAdminClient();
  const forecast = await getNextMonthIncomeForecastForManager(
    adminClient,
    actorUserId
  );

  return <IncomeStatementNextMonthCards forecast={forecast} />;
}
