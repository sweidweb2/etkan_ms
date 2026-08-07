"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BadgeDollarSignIcon,
  SlidersHorizontalIcon,
  TrendingUpIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Can } from "@/components/auth/can";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { IncomeStatementAnalyticsEtkanTab, IncomeStatementAnalyticsStudentsTab } from "@/components/manager/accounting/income-statement-analytics-tables";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
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

const FLOW_COLORS = {
  payments: "#10b981",
  credits: "#14b8a6",
  debits: "#f43f5e",
} as const;

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

type BodyTab = "graphs" | "etkan" | "students";

type IncomeStatementAnalyticsPanelProps = {
  data: ManagerIncomeStatementAnalyticsData;
};

function moneyTooltip(value: unknown) {
  return formatPaymentPhaseMoney(Number(value ?? 0));
}

export function IncomeStatementAnalyticsPanel({
  data,
}: IncomeStatementAnalyticsPanelProps) {
  const router = useRouter();
  const [bodyTab, setBodyTab] = useState<BodyTab>("graphs");
  const monthValue = data.month === null ? "all" : String(data.month);
  const periodLabel = data.month === null ? "by month" : "by day";
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

  const hasPeriodData = data.periodSeries.some(
    (row) => row.payments > 0 || row.credits > 0 || row.debits > 0
  );

  const { payments, credits, debits } = data.totals;
  const totalInflow = payments + credits;
  const netCash = totalInflow - debits;

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
          icon={BadgeDollarSignIcon}
          iconClassName="text-emerald-500"
        />
        <AnalyticsStatCard
          label="Credits"
          value={formatPaymentPhaseMoney(credits)}
          icon={ArrowDownLeftIcon}
          iconClassName="text-teal-500"
        />
        <AnalyticsStatCard
          label="Debits"
          value={formatPaymentPhaseMoney(debits)}
          icon={ArrowUpRightIcon}
          iconClassName="text-rose-500"
        />
        <AnalyticsStatCard
          label="Adjustments"
          value="Soon will be activated"
          icon={SlidersHorizontalIcon}
          iconClassName="text-amber-500/60"
          valueClassName="text-sm font-medium text-muted-foreground"
        />
        <AnalyticsStatCard
          label="Total inflow"
          value={formatPaymentPhaseMoney(totalInflow)}
          icon={TrendingUpIcon}
          iconClassName="text-sky-500"
        />
        <AnalyticsStatCard
          label="Net cash"
          value={formatPaymentPhaseMoney(netCash)}
          icon={WalletIcon}
          iconClassName="text-violet-500"
        />
      </div>

      <TabsPrimitive
        value={bodyTab}
        onValueChange={(value) => setBodyTab(value as BodyTab)}
        className="flex flex-col gap-4"
      >
        <div className="flex justify-center">
          <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center justify-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 sm:w-fit">
            <TabsTriggerPrimitive value="graphs" className={TAB_TRIGGER_CLASS}>
              Graphs
            </TabsTriggerPrimitive>
            <TabsTriggerPrimitive value="etkan" className={TAB_TRIGGER_CLASS}>
              Etkan
            </TabsTriggerPrimitive>
            <TabsTriggerPrimitive value="students" className={TAB_TRIGGER_CLASS}>
              Students
            </TabsTriggerPrimitive>
          </TabsListPrimitive>
        </div>

        <TabsContentsPrimitive>
          <TabsContentPrimitive value="graphs" className="outline-none">
            <div className="grid gap-6 xl:grid-cols-2">
              <AnalyticsChartCard
                title={`Cash flow ${periodLabel}`}
                description="Line chart of payments, credits, and debits."
              >
                <div className="h-[18rem] w-full min-w-0">
                  {hasPeriodData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data.periodSeries}
                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border/60"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) =>
                            formatPaymentPhaseMoney(Number(value))
                          }
                          width={72}
                        />
                        <Tooltip formatter={moneyTooltip} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="payments"
                          name="Payments"
                          stroke={FLOW_COLORS.payments}
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="credits"
                          name="Credits"
                          stroke={FLOW_COLORS.credits}
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="debits"
                          name="Debits"
                          stroke={FLOW_COLORS.debits}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart />
                  )}
                </div>
              </AnalyticsChartCard>

              <AnalyticsChartCard
                title={`Stacked volume ${periodLabel}`}
                description="Area chart including adjustments."
              >
                <div className="h-[18rem] w-full min-w-0">
                  <ComingSoonChart />
                </div>
              </AnalyticsChartCard>

              <AnalyticsChartCard
                title={`Comparison ${periodLabel}`}
                description="Grouped bars for the selected period."
              >
                <div className="h-[18rem] w-full min-w-0">
                  <ComingSoonChart />
                </div>
              </AnalyticsChartCard>

              <AnalyticsChartCard
                title="Composition"
                description="Share of payments, credits, debits, and adjustments."
              >
                <div className="h-[18rem] w-full min-w-0">
                  <ComingSoonChart />
                </div>
              </AnalyticsChartCard>
            </div>
          </TabsContentPrimitive>

          <TabsContentPrimitive value="etkan" className="outline-none">
            <IncomeStatementAnalyticsEtkanTab
              transactions={data.transactions}
            />
          </TabsContentPrimitive>

          <TabsContentPrimitive value="students" className="outline-none">
            <IncomeStatementAnalyticsStudentsTab
              payments={data.payments}
              unpaidStudents={data.unpaidStudents}
              adjustedStudents={data.adjustedStudents}
            />
          </TabsContentPrimitive>
        </TabsContentsPrimitive>
      </TabsPrimitive>
    </div>
  );
}

function AnalyticsStatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border px-4 py-3">
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${iconClassName}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`mt-1 tabular-nums ${valueClassName ?? "text-xl font-semibold"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      No data for this period.
    </div>
  );
}

function ComingSoonChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      Soon will be activated
    </div>
  );
}
