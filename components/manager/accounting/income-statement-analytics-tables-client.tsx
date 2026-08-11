"use client";

import { useState } from "react";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import {
  IncomeStatementAnalyticsEtkanTab,
  IncomeStatementAnalyticsStudentsTab,
} from "@/components/manager/accounting/income-statement-analytics-tables";
import { cn } from "@/lib/utils";
import type { ManagerIncomeStatementAnalyticsTables } from "@/types/manager-income-statement-analytics";

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

type TablesTab = "etkan" | "students";

type IncomeStatementAnalyticsTablesClientProps = {
  year: number;
  month: number | null;
  tables: ManagerIncomeStatementAnalyticsTables;
};

export function IncomeStatementAnalyticsTablesClient({
  year,
  month,
  tables,
}: IncomeStatementAnalyticsTablesClientProps) {
  const [tab, setTab] = useState<TablesTab>("students");

  return (
    <TabsPrimitive
      value={tab}
      onValueChange={(value) => setTab(value as TablesTab)}
      className="flex flex-col gap-4"
    >
      <div className="flex justify-center">
        <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center justify-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 sm:w-fit">
          <TabsTriggerPrimitive value="etkan" className={TAB_TRIGGER_CLASS}>
            Etkan
          </TabsTriggerPrimitive>
          <TabsTriggerPrimitive value="students" className={TAB_TRIGGER_CLASS}>
            Students
          </TabsTriggerPrimitive>
        </TabsListPrimitive>
      </div>
      <TabsContentsPrimitive>
        <TabsContentPrimitive value="etkan" className="outline-none">
          <IncomeStatementAnalyticsEtkanTab
            key={`etkan-${year}-${month ?? "all"}`}
            transactions={tables.transactions}
          />
        </TabsContentPrimitive>
        <TabsContentPrimitive value="students" className="outline-none">
          <IncomeStatementAnalyticsStudentsTab
            key={`students-${year}-${month ?? "all"}`}
            payments={tables.payments}
            unpaidStudents={tables.unpaidStudents}
            adjustedStudents={tables.adjustedStudents}
          />
        </TabsContentPrimitive>
      </TabsContentsPrimitive>
    </TabsPrimitive>
  );
}
