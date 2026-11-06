import { cache } from "react";
import {
  IncomeStatementAnalyticsEtkanTab,
  IncomeStatementAnalyticsStudentsTab,
} from "@/components/manager/accounting/income-statement-analytics-tables";
import { getRequestAdminClient } from "@/lib/supabase/admin";
import { getIncomeStatementAnalyticsTablesForManager } from "@/services/accounting/income-statement-analytics.service";

/** Etkan and Academy tabs render separate sections; share one fetch per request. */
const loadAnalyticsTables = cache(
  (actorUserId: string, year: number, month: number | null) =>
    getIncomeStatementAnalyticsTablesForManager(
      getRequestAdminClient(),
      actorUserId,
      { year, month }
    )
);

type IncomeStatementAnalyticsTablesSectionProps = {
  actorUserId: string;
  year: number;
  month: number | null;
  view: "etkan" | "academy";
};

export async function IncomeStatementAnalyticsTablesSection({
  actorUserId,
  year,
  month,
  view,
}: IncomeStatementAnalyticsTablesSectionProps) {
  const tables = await loadAnalyticsTables(actorUserId, year, month);

  if (view === "etkan") {
    return (
      <IncomeStatementAnalyticsEtkanTab
        key={`etkan-${year}-${month ?? "all"}`}
        transactions={tables.transactions}
        month={month}
      />
    );
  }

  return (
    <IncomeStatementAnalyticsStudentsTab
      key={`academy-${year}-${month ?? "all"}`}
      payments={tables.payments}
      unpaidStudents={tables.unpaidStudents}
      adjustedStudents={tables.adjustedStudents}
      month={month}
    />
  );
}
