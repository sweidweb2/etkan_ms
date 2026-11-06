import type { ReactNode } from "react";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
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
      <PanelPageHeader title="Past months" />
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

      <div className="flex flex-wrap items-center justify-end gap-2 empty:hidden">
        <div className="w-full @lg/panel:w-64">
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
