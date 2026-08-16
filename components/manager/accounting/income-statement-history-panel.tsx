"use client";

import { useRouter } from "next/navigation";
import { IncomeStatementPanel } from "@/components/manager/accounting/income-statement-panel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/lib/constants/routes";
import type {
  IncomeStatementMonthOption,
  ManagerIncomeStatementData,
} from "@/types/manager-income-statement";

type IncomeStatementHistoryPanelProps = {
  months: IncomeStatementMonthOption[];
  selectedMonthKey: string | null;
  data: ManagerIncomeStatementData | null;
  periodLabel: string | null;
};

export function IncomeStatementHistoryPanel({
  months,
  selectedMonthKey,
  data,
  periodLabel,
}: IncomeStatementHistoryPanelProps) {
  const router = useRouter();

  const monthItems = months.map((month) => ({
    value: month.key,
    label: month.label,
  }));

  function handleMonthChange(value: string | null) {
    if (!value) {
      return;
    }
    router.push(
      `${ROUTES.MANAGER_INCOME_STATEMENT_HISTORY}?month=${encodeURIComponent(value)}`
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_INCOME_STATEMENT}>
              Income statement
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Past months</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Past months
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only income statement for a previous month that has recorded
            activity.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <label
            htmlFor="income-statement-history-month"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Month
          </label>
          {months.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
              No past months with data yet.
            </p>
          ) : (
            <Select
              value={selectedMonthKey ?? undefined}
              items={monthItems}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger
                id="income-statement-history-month"
                className="w-full"
                aria-label="Select month"
              >
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.key} value={month.key}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {months.length === 0 ? null : data && periodLabel ? (
        <IncomeStatementPanel
          data={data}
          defaultRecordedBy=""
          periodLabel={periodLabel}
          readOnly
          hideAllTimePaymentsCard
        />
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Select a month to view its income statement.
        </p>
      )}
    </div>
  );
}
