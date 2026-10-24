import type { ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ROUTES } from "@/lib/constants/routes";

type IncomeStatementHistoryPanelProps = {
  /** Month picker (streamed independently of the statement body). */
  monthSelectSlot: ReactNode;
  /** Read-only statement for the selected month (streamed). */
  statementSlot: ReactNode;
};

export function IncomeStatementHistoryPanel({
  monthSelectSlot,
  statementSlot,
}: IncomeStatementHistoryPanelProps) {
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
          {monthSelectSlot}
        </div>
      </div>

      {statementSlot}
    </div>
  );
}
