import { IncomeStatementAnalyticsTablesClient } from "@/components/manager/accounting/income-statement-analytics-tables-client";
import { getRequestAdminClient } from "@/lib/supabase/admin";
import { getIncomeStatementAnalyticsTablesForManager } from "@/services/accounting/income-statement-analytics.service";

type IncomeStatementAnalyticsTablesSectionProps = {
  actorUserId: string;
  year: number;
  month: number | null;
};

export async function IncomeStatementAnalyticsTablesSection({
  actorUserId,
  year,
  month,
}: IncomeStatementAnalyticsTablesSectionProps) {
  const adminClient = getRequestAdminClient();
  const tables = await getIncomeStatementAnalyticsTablesForManager(
    adminClient,
    actorUserId,
    { year, month }
  );

  return (
    <IncomeStatementAnalyticsTablesClient
      year={year}
      month={month}
      tables={tables}
    />
  );
}
