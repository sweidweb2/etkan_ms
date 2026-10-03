"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BadgeDollarSignIcon,
  SlidersHorizontalIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { AnalyticsStatCard } from "@/components/manager/accounting/analytics-stat-card";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { IncomeStatementAnalyticsEtkanTab, IncomeStatementAnalyticsStudentsTab } from "@/components/manager/accounting/income-statement-analytics-tables";
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
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerIncomeStatementAnalyticsData } from "@/types/manager-income-statement-analytics";

const MONTH_OPTIONS = [
  { value: "all", label: "All months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

type BodyTab = "etkan" | "students";

type IncomeStatementAnalyticsPanelProps = {
  data: ManagerIncomeStatementAnalyticsData;
  /** When set, Etkan/Students tab bodies are replaced by this slot (Suspense tables). */
  tablesSlot?: ReactNode;
  /** Next-month forecast cards, loaded separately from the period stats. */
  forecastSlot?: ReactNode;
};

export function IncomeStatementAnalyticsPanel({
  data,
  tablesSlot,
  forecastSlot,
}: IncomeStatementAnalyticsPanelProps) {
  const router = useRouter();
  const [bodyTab, setBodyTab] = useState<BodyTab>("etkan");
  const monthValue = data.month === null ? "all" : String(data.month);
  const selectedMonthLabel =
    MONTH_OPTIONS.find((option) => option.value === monthValue)?.label ??
    "All months";

  function updateQuery(next: { year?: number; month?: string }) {
    const params = new URLSearchParams();
    params.set("year", String(next.year ?? data.year));
    const month = next.month ?? monthValue;
    params.set("month", month);
    router.push(
      `${ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS}?${params.toString()}`
    );
  }

  const { payments, credits, debits, adjustments } = data.totals;
  const totalInflow = payments + credits;
  const availableMoney = totalInflow - debits;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <Can
            permission={PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_VIEW}
            fallback={
              <BreadcrumbItem>
                <BreadcrumbPage>Income analytics</BreadcrumbPage>
              </BreadcrumbItem>
            }
          >
            <BreadcrumbItem>
              <BreadcrumbLink href={ROUTES.MANAGER_INCOME_STATEMENT}>
                Income statement
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Analytics</BreadcrumbPage>
            </BreadcrumbItem>
          </Can>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Period</p>
          <p className="text-xs text-muted-foreground">
            Stats and body views use payments and transactions from{" "}
            {data.month === null
              ? data.year
              : `${selectedMonthLabel} ${data.year}`}
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(data.year)}
            onValueChange={(value) => {
              if (value == null) return;
              updateQuery({ year: Number(value) });
            }}
          >
            <SelectTrigger className="w-[8.5rem]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {data.availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={monthValue}
            onValueChange={(value) => {
              if (value == null) return;
              updateQuery({ month: value });
            }}
          >
            <SelectTrigger className="w-[10rem]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Income statement analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Payments, credits, and debits for the selected period.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnalyticsStatCard
          label="Payments"
          value={formatPaymentPhaseMoney(payments)}
          description="Sum of student SPP payment amounts whose payment date falls in the selected period."
          icon={BadgeDollarSignIcon}
          iconClassName="text-emerald-500"
        />
        <AnalyticsStatCard
          label="Credits"
          value={formatPaymentPhaseMoney(credits)}
          description="Sum of external credit transactions recorded in the selected period."
          icon={ArrowDownLeftIcon}
          iconClassName="text-teal-500"
        />
        <AnalyticsStatCard
          label="Debits"
          value={formatPaymentPhaseMoney(debits)}
          description="Sum of external debit transactions recorded in the selected period."
          icon={ArrowUpRightIcon}
          iconClassName="text-rose-500"
        />
        <AnalyticsStatCard
          label="Adjustments"
          value={formatPaymentPhaseMoney(adjustments)}
          description="Scholarships, discounts, and manual adjustments for the selected period, converted to dollars like the income statement."
          icon={SlidersHorizontalIcon}
          iconClassName="text-amber-500"
        />
        <AnalyticsStatCard
          label="Total inflow"
          value={formatPaymentPhaseMoney(totalInflow)}
          description="Payments plus credits for the selected period (money coming in)."
          icon={TrendingUpIcon}
          iconClassName="text-sky-500"
        />
        <AnalyticsStatCard
          label="Available money"
          value={formatPaymentPhaseMoney(availableMoney)}
          description="Payments plus credits minus debits for the selected period."
          icon={WalletIcon}
          iconClassName="text-violet-500"
        />
      </div>

      {forecastSlot}

      {tablesSlot}

      {!tablesSlot ? (
        <TabsPrimitive
          value={bodyTab}
          onValueChange={(value) => setBodyTab(value as BodyTab)}
          className="flex flex-col gap-4"
        >
          <div className="flex justify-center">
            <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center justify-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 sm:w-fit">
              <TabsTriggerPrimitive value="etkan" className={TAB_TRIGGER_CLASS}>
                Etkan
              </TabsTriggerPrimitive>
              <TabsTriggerPrimitive
                value="students"
                className={TAB_TRIGGER_CLASS}
              >
                Students
              </TabsTriggerPrimitive>
            </TabsListPrimitive>
          </div>

          <TabsContentsPrimitive>
            <TabsContentPrimitive value="etkan" className="outline-none">
              <IncomeStatementAnalyticsEtkanTab
                key={`etkan-${data.year}-${data.month ?? "all"}`}
                transactions={data.transactions}
                month={data.month}
              />
            </TabsContentPrimitive>

            <TabsContentPrimitive value="students" className="outline-none">
              <IncomeStatementAnalyticsStudentsTab
                key={`students-${data.year}-${data.month ?? "all"}`}
                payments={data.payments}
                unpaidStudents={data.unpaidStudents}
                adjustedStudents={data.adjustedStudents}
                month={data.month}
              />
            </TabsContentPrimitive>
          </TabsContentsPrimitive>
        </TabsPrimitive>
      ) : null}
    </div>
  );
}