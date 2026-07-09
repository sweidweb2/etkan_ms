"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { StudentDetailStatCard } from "@/components/manager/students/student-detail-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import { getSubscribedSemesterFinancialStats } from "@/lib/manager/get-subscribed-semester-financial-stats";
import { cn } from "@/lib/utils";
import type { ManagerScheduledPaymentRow } from "@/types/manager-scheduled-payment";
import type {
  ManagerStudentPaymentRow,
  ManagerSubscribedSemesterRow,
} from "@/types/manager-student-account";

type SubscribedSemesterFinancialSectionProps = {
  subscription: ManagerSubscribedSemesterRow;
  payments: ManagerStudentPaymentRow[];
  scheduledPayments: ManagerScheduledPaymentRow[];
};

export function SubscribedSemesterFinancialSection({
  subscription,
  payments,
  scheduledPayments,
}: SubscribedSemesterFinancialSectionProps) {
  const stats = useMemo(
    () =>
      getSubscribedSemesterFinancialStats(
        subscription,
        payments,
        scheduledPayments
      ),
    [payments, scheduledPayments, subscription]
  );

  const lastPaymentLabel = stats.lastPaymentAt
    ? format(new Date(stats.lastPaymentAt), "MMM d, yyyy")
    : "—";

  return (
    <Card className="py-0">
      <CardHeader className="border-b bg-muted/40 py-4">
        <CardTitle>Financial summary</CardTitle>
        <p className="text-sm text-muted-foreground">
          Totals and progress for {subscription.semester_name}.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 py-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Payment progress</span>
            <span className="font-medium tabular-nums">
              {stats.paidProgressPercent}% paid
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                stats.paidProgressPercent >= 100
                  ? "bg-emerald-500"
                  : stats.paidProgressPercent >= 50
                    ? "bg-sky-500"
                    : "bg-amber-500"
              )}
              style={{ width: `${stats.paidProgressPercent}%` }}
              role="progressbar"
              aria-valuenow={stats.paidProgressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Payment progress"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StudentDetailStatCard
            label="Total subscribed"
            value={formatAccountCurrency(stats.totalSubscribed)}
            accentClassName="border-l-sky-500"
          />
          <StudentDetailStatCard
            label="Total paid"
            value={formatAccountCurrency(stats.totalPaid)}
            accentClassName="border-l-emerald-500"
          />
          <StudentDetailStatCard
            label="Total due"
            value={formatAccountCurrency(stats.totalDue)}
            accentClassName="border-l-amber-500"
          />
          <StudentDetailStatCard
            label="Paid progress"
            value={`${stats.paidProgressPercent}%`}
            accentClassName="border-l-violet-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StudentDetailStatCard
            label="Payments recorded"
            value={stats.paymentCount}
            accentClassName="border-l-sky-500/70"
          />
          <StudentDetailStatCard
            label="Scheduled reminders"
            value={stats.scheduledReminderCount}
            accentClassName="border-l-violet-500/70"
          />
          <StudentDetailStatCard
            label="Upcoming reminder amount"
            value={formatAccountCurrency(stats.upcomingScheduledAmount)}
            accentClassName="border-l-amber-500/70"
          />
          <StudentDetailStatCard
            label="Last payment"
            value={lastPaymentLabel}
            accentClassName="border-l-emerald-500/70"
          />
        </div>
      </CardContent>
    </Card>
  );
}
