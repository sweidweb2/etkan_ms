"use client";

import { useRouter } from "next/navigation";
import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  BadgeDollarSignIcon,
  CalculatorIcon,
  ChartColumnIcon,
  SlidersHorizontalIcon,
  TrendingUpIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { ROUTES } from "@/lib/constants/routes";
import type { ManagerIncomeStatementAnalyticsData } from "@/types/manager-income-statement-analytics";

const FLOW_COLORS = {
  payments: "#10b981",
  credits: "#14b8a6",
  debits: "#f43f5e",
  adjustments: "#f59e0b",
} as const;

const PIE_COLORS = [
  "#10b981",
  "#14b8a6",
  "#f43f5e",
  "#f59e0b",
  "#8b5cf6",
  "#0ea5e9",
  "#84cc16",
  "#e11d48",
  "#64748b",
  "#d946ef",
];

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
  const monthValue = data.month === null ? "all" : String(data.month);
  const periodLabel = data.month === null ? "by month" : "by day";

  function updateQuery(next: { year?: number; month?: string }) {
    const params = new URLSearchParams();
    params.set("year", String(next.year ?? data.year));
    const month = next.month ?? monthValue;
    if (month !== "all") {
      params.set("month", month);
    }
    router.push(
      `${ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS}?${params.toString()}`
    );
  }

  const hasPeriodData = data.periodSeries.some(
    (row) =>
      row.payments > 0 ||
      row.credits > 0 ||
      row.debits > 0 ||
      row.adjustments > 0
  );

  const { payments, credits, debits, adjustments } = data.totals;
  const totalInflow = payments + credits;
  const netCash = totalInflow - debits;
  const netExternal = credits - debits;
  const netAfterAdjustments = netCash - adjustments;
  const periodBucketCount = Math.max(data.periodSeries.length, 1);
  const averagePeriodInflow = totalInflow / periodBucketCount;
  const averagePeriodPayment = payments / periodBucketCount;
  const periodAverageLabel =
    data.month === null ? "Avg monthly inflow" : "Avg daily inflow";
  const periodPaymentAverageLabel =
    data.month === null ? "Avg monthly payment" : "Avg daily payment";

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
            <BreadcrumbPage>Analytics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Income statement analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Payments, credits, debits, and adjustments over time.
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

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
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
          value={formatPaymentPhaseMoney(adjustments)}
          icon={SlidersHorizontalIcon}
          iconClassName="text-amber-500"
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
        <AnalyticsStatCard
          label="Net external"
          value={formatPaymentPhaseMoney(netExternal)}
          icon={ArrowLeftRightIcon}
          iconClassName="text-cyan-500"
        />
        <AnalyticsStatCard
          label="Net after adjustments"
          value={formatPaymentPhaseMoney(netAfterAdjustments)}
          icon={CalculatorIcon}
          iconClassName="text-indigo-500"
        />
        <AnalyticsStatCard
          label={periodAverageLabel}
          value={formatPaymentPhaseMoney(averagePeriodInflow)}
          icon={ChartColumnIcon}
          iconClassName="text-blue-500"
        />
        <AnalyticsStatCard
          label={periodPaymentAverageLabel}
          value={formatPaymentPhaseMoney(averagePeriodPayment)}
          icon={BadgeDollarSignIcon}
          iconClassName="text-lime-600"
        />
      </div>

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
            {hasPeriodData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
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
                  <Area
                    type="monotone"
                    dataKey="payments"
                    name="Payments"
                    stackId="1"
                    stroke={FLOW_COLORS.payments}
                    fill={FLOW_COLORS.payments}
                    fillOpacity={0.35}
                  />
                  <Area
                    type="monotone"
                    dataKey="credits"
                    name="Credits"
                    stackId="1"
                    stroke={FLOW_COLORS.credits}
                    fill={FLOW_COLORS.credits}
                    fillOpacity={0.35}
                  />
                  <Area
                    type="monotone"
                    dataKey="debits"
                    name="Debits"
                    stackId="1"
                    stroke={FLOW_COLORS.debits}
                    fill={FLOW_COLORS.debits}
                    fillOpacity={0.35}
                  />
                  <Area
                    type="monotone"
                    dataKey="adjustments"
                    name="Adjustments"
                    stackId="1"
                    stroke={FLOW_COLORS.adjustments}
                    fill={FLOW_COLORS.adjustments}
                    fillOpacity={0.35}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Comparison ${periodLabel}`}
          description="Grouped bars for the selected period."
        >
          <div className="h-[18rem] w-full min-w-0">
            {hasPeriodData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
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
                  <Bar
                    dataKey="payments"
                    name="Payments"
                    fill={FLOW_COLORS.payments}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="credits"
                    name="Credits"
                    fill={FLOW_COLORS.credits}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="debits"
                    name="Debits"
                    fill={FLOW_COLORS.debits}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Composition"
          description="Share of payments, credits, debits, and adjustments."
        >
          <div className="h-[18rem] w-full min-w-0">
            {data.composition.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.composition}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={84}
                    paddingAngle={2}
                  >
                    {data.composition.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={moneyTooltip} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </AnalyticsChartCard>
      </div>
    </div>
  );
}

function AnalyticsStatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border px-4 py-3">
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${iconClassName}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
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
