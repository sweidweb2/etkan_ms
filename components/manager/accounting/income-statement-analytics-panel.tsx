"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BadgeDollarSignIcon,
  EyeOffIcon,
  SlidersHorizontalIcon,
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
import { PanelPageHeader } from "@/components/panels/panel-page-header";
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
import { useHasMounted } from "@/hooks/use-has-mounted";
import {
  MANAGER_INCOME_ANALYTICS_TABS,
  readManagerIncomeAnalyticsTab,
  writeManagerIncomeAnalyticsTab,
  type ManagerIncomeAnalyticsTab,
} from "@/lib/constants/manager-income-analytics-tabs";
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

type IncomeStatementAnalyticsPanelProps = {
  data: ManagerIncomeStatementAnalyticsData;
  /** When set, replaces the Etkan tab body (Suspense table). */
  etkanSlot?: ReactNode;
  /** When set, replaces the Academy tab body (Suspense tables). */
  academySlot?: ReactNode;
  /** Next-month forecast cards, loaded separately from the period stats. */
  forecastSlot?: ReactNode;
};

export function IncomeStatementAnalyticsPanel({
  data,
  etkanSlot,
  academySlot,
  forecastSlot,
}: IncomeStatementAnalyticsPanelProps) {
  const router = useRouter();
  const hasMounted = useHasMounted();
  const [bodyTab, setBodyTab] = useState<ManagerIncomeAnalyticsTab>(
    MANAGER_INCOME_ANALYTICS_TABS.NONE
  );
  const [hasRestoredTab, setHasRestoredTab] = useState(false);

  if (hasMounted && !hasRestoredTab) {
    setHasRestoredTab(true);
    setBodyTab(
      readManagerIncomeAnalyticsTab() ?? MANAGER_INCOME_ANALYTICS_TABS.NONE
    );
  }

  function handleTabChange(tab: ManagerIncomeAnalyticsTab) {
    setBodyTab(tab);
    writeManagerIncomeAnalyticsTab(tab);
  }
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

  const {
    payments,
    credits,
    debits,
    adjustments,
    cashTransactions,
    whishTransactions,
  } = data.totals;
  const totalInflow = payments + credits;
  const availableMoney = totalInflow - debits;
  const periodLabel =
    data.month === null ? String(data.year) : `${selectedMonthLabel} ${data.year}`;

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title="Income statement analytics" />
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

      <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
        <div>
          <p className="text-sm font-medium">Period</p>
          <p className="text-xs text-muted-foreground">
            Stats and body views use payments and transactions from{" "}
            {periodLabel}.
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

      <section
        aria-label="Available money"
        className="relative isolate overflow-hidden rounded-xl text-[#1f1f45] ring-1 ring-[#3e3e75]/15 shadow-[0_12px_32px_-18px_rgb(62_62_117/0.55)] @4xl/panel:min-h-[16rem]"
      >
        <Image
          src="/panel-images/fintech_payment_banner.svg"
          alt=""
          fill
          priority
          unoptimized
          sizes="(min-width: 1280px) 1100px, 100vw"
          className="-z-10 object-cover object-right"
        />
        {/* Image is light lavender in both themes; text colors are fixed to match it. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[#ece9fe]/95 via-[#ece9fe]/85 to-[#ece9fe]/55 @4xl/panel:via-[#ece9fe]/50 @4xl/panel:to-transparent"
        />

        <div className="flex h-full flex-col justify-center gap-5 px-5 py-6 @2xl/panel:px-7 @4xl/panel:max-w-[58%]">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-[#3e3e75]">
              <WalletIcon className="size-4" aria-hidden />
              Available money
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
              {formatPaymentPhaseMoney(availableMoney)}
            </p>
            <p className="mt-1.5 text-sm text-[#3e3e75]">
              Payments plus credits minus debits for {periodLabel}.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 @2xl/panel:grid-cols-4 @4xl/panel:grid-cols-2 @6xl/panel:grid-cols-4">
            {[
              { label: "Total inflow", value: totalInflow },
              { label: "Debits", value: debits },
              { label: "Cash transactions", value: cashTransactions },
              { label: "Whish transactions", value: whishTransactions },
            ].map((item) => (
              <div
                key={item.label}
                className="min-w-0 border-l border-[#3e3e75]/25 pl-3"
              >
                <dt className="truncate text-xs text-[#3e3e75]">
                  {item.label}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  {formatPaymentPhaseMoney(item.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <TabsPrimitive
        value={bodyTab}
        onValueChange={(value) =>
          handleTabChange(value as ManagerIncomeAnalyticsTab)
        }
        className="flex flex-col gap-4"
      >
        <div className="flex justify-center">
          <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center justify-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 @lg/panel:w-fit">
            <TabsTriggerPrimitive
              value={MANAGER_INCOME_ANALYTICS_TABS.NONE}
              aria-label="Hide details"
              title="Hide details"
              className={cn(TAB_TRIGGER_CLASS, "px-2.5 sm:px-2.5")}
            >
              <EyeOffIcon className="size-4" aria-hidden />
            </TabsTriggerPrimitive>
            <TabsTriggerPrimitive value="general" className={TAB_TRIGGER_CLASS}>
              General
            </TabsTriggerPrimitive>
            <TabsTriggerPrimitive value="etkan" className={TAB_TRIGGER_CLASS}>
              Etkan
            </TabsTriggerPrimitive>
            <TabsTriggerPrimitive value="academy" className={TAB_TRIGGER_CLASS}>
              Academy
            </TabsTriggerPrimitive>
          </TabsListPrimitive>
        </div>

        <TabsContentsPrimitive>
          <TabsContentPrimitive
            value={MANAGER_INCOME_ANALYTICS_TABS.NONE}
            className="outline-none"
          >
            <></>
          </TabsContentPrimitive>
          <TabsContentPrimitive value="general" className="outline-none">
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-4">
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
              </div>

              {forecastSlot}
            </div>
          </TabsContentPrimitive>

          <TabsContentPrimitive value="etkan" className="outline-none">
            {etkanSlot ?? (
              <IncomeStatementAnalyticsEtkanTab
                key={`etkan-${data.year}-${data.month ?? "all"}`}
                transactions={data.transactions}
                month={data.month}
              />
            )}
          </TabsContentPrimitive>

          <TabsContentPrimitive value="academy" className="outline-none">
            {academySlot ?? (
              <IncomeStatementAnalyticsStudentsTab
                key={`academy-${data.year}-${data.month ?? "all"}`}
                payments={data.payments}
                unpaidStudents={data.unpaidStudents}
                adjustedStudents={data.adjustedStudents}
                month={data.month}
              />
            )}
          </TabsContentPrimitive>
        </TabsContentsPrimitive>
      </TabsPrimitive>
    </div>
  );
}
