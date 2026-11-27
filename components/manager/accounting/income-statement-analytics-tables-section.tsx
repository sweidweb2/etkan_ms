import {
  IncomeStatementAnalyticsEtkanTab,
  IncomeStatementAnalyticsStudentsTab,
} from "@/components/manager/accounting/income-statement-analytics-tables";
import { loadIncomeStatementAnalyticsTablesDeferredForManager } from "@/services/accounting/income-statement-analytics.service";

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
  const tables = await loadIncomeStatementAnalyticsTablesDeferredForManager(
    actorUserId,
    year,
    month
  );

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
