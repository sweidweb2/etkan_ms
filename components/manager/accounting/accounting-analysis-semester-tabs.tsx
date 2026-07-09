"use client";

import { useMemo, useState } from "react";
import { LayoutGridIcon } from "lucide-react";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { AccountingAnalysisAllSemestersPanel } from "@/components/manager/accounting/accounting-analysis-all-semesters-panel";
import { AccountingAnalysisSemesterPanel } from "@/components/manager/accounting/accounting-analysis-semester-panel";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ANALYTICS_PERIOD_OPTIONS } from "@/lib/constants/manager-analytics-mock";
import {
  getAccountingAnalysisAllSemesters,
  getAccountingAnalysisForSemester,
  getAccountingAnalysisSemesterOptions,
} from "@/lib/manager/get-manager-accounting-analytics-preview";
import { cn } from "@/lib/utils";
import type { AccountingAnalysisPeriod } from "@/types/manager-accounting-analytics";

const ALL_SEMESTERS_TAB = "all";

const tabTriggerClassName = cn(
  "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

export function AccountingAnalysisSemesterTabs() {
  const semesterOptions = useMemo(
    () => getAccountingAnalysisSemesterOptions(),
    []
  );
  const [activeTab, setActiveTab] = useState(ALL_SEMESTERS_TAB);
  const [period, setPeriod] = useState<AccountingAnalysisPeriod>("30d");

  const allSemestersAnalytics = useMemo(
    () => getAccountingAnalysisAllSemesters(period),
    [period]
  );

  const semesterAnalyticsById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getAccountingAnalysisForSemester>>();

    for (const semester of semesterOptions) {
      map.set(semester.id, getAccountingAnalysisForSemester(semester.id, period));
    }

    return map;
  }, [period, semesterOptions]);

  return (
    <Card className="py-0">
      <CardContent className="px-0 pb-0">
        <TabsPrimitive
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col gap-0"
        >
          <div className="grid grid-cols-1 items-center gap-4 border-b bg-muted/25 px-4 pt-2 pb-3 lg:grid-cols-[1fr_auto_1fr]">
            <div aria-hidden="true" className="hidden lg:block" />

            <div className="min-w-0 overflow-x-auto">
              <TabsListPrimitive className="inline-flex h-auto w-max min-w-full items-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 lg:min-w-0">
                <TabsTriggerPrimitive
                  value={ALL_SEMESTERS_TAB}
                  className={cn(
                    tabTriggerClassName,
                    "data-[state=active]:border-primary/40 data-[state=active]:ring-1 data-[state=active]:ring-primary/20"
                  )}
                >
                  <LayoutGridIcon className="size-4 shrink-0" />
                  All semesters
                </TabsTriggerPrimitive>

                {semesterOptions.map((semester) => (
                  <TabsTriggerPrimitive
                    key={semester.id}
                    value={semester.id}
                    className={tabTriggerClassName}
                  >
                    <span>{semester.shortName}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                      {semester.studentCount}
                    </span>
                  </TabsTriggerPrimitive>
                ))}
              </TabsListPrimitive>
            </div>

            <div className="flex justify-start lg:justify-end">
              <Select
                value={period}
                onValueChange={(value) =>
                  setPeriod((value ?? "30d") as AccountingAnalysisPeriod)
                }
              >
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Analysis period"
                >
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent align="end">
                  {ANALYTICS_PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContentsPrimitive>
            <TabsContentPrimitive value={ALL_SEMESTERS_TAB} className="p-4 sm:p-6">
              <AccountingAnalysisAllSemestersPanel
                analytics={allSemestersAnalytics}
                semesterOptions={semesterOptions}
              />
            </TabsContentPrimitive>

            {semesterOptions.map((semester) => {
              const analytics = semesterAnalyticsById.get(semester.id);

              return (
                <TabsContentPrimitive
                  key={semester.id}
                  value={semester.id}
                  className="p-4 sm:p-6"
                >
                  {analytics ? (
                    <AccountingAnalysisSemesterPanel analytics={analytics} />
                  ) : null}
                </TabsContentPrimitive>
              );
            })}
          </TabsContentsPrimitive>
        </TabsPrimitive>
      </CardContent>
    </Card>
  );
}
