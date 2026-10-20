"use client";

import { format } from "date-fns";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { PaymentScheduleStatusBadge } from "@/components/manager/accounting/payment-schedule-status-badge";
import { SppCurrentBadge } from "@/components/manager/accounting/spp-current-badge";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { ROUTES } from "@/lib/constants/routes";
import {
  FINANCIAL_ADJUSTMENT_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  PAYMENT_METHOD_LABELS,
  type FinancialAdjustmentType,
  type FinancialAdjustmentValueType,
  type PaymentMethod,
} from "@/lib/manager/accounting/constants";
import { resolveSppDisplayStatus } from "@/lib/manager/accounting/spp-display-status";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerFinancialAdjustmentRow } from "@/types/manager-financial-adjustment";
import type {
  ManagerSppDetail,
  ManagerStudentPaymentRow,
} from "@/types/manager-student-payment";
import type { ManagerStudentPaymentScheduleRow } from "@/types/manager-student-payment-schedule";

type StudentSppDetailsPanelProps = {
  spp: ManagerSppDetail;
  payments: ManagerStudentPaymentRow[];
  schedules: ManagerStudentPaymentScheduleRow[];
  adjustment: ManagerFinancialAdjustmentRow | null;
};

function formatAdjustmentValue(
  valueType: FinancialAdjustmentValueType,
  value: number
) {
  if (valueType === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE) {
    return `${value}%`;
  }
  return formatPaymentPhaseMoney(value);
}

function sortPayments(rows: ManagerStudentPaymentRow[]) {
  return [...rows].sort(
    (a, b) =>
      b.payment_date.localeCompare(a.payment_date) ||
      b.created_at.localeCompare(a.created_at)
  );
}

function sortSchedules(rows: ManagerStudentPaymentScheduleRow[]) {
  return [...rows].sort((left, right) => {
    if (left.due_date !== right.due_date) {
      return left.due_date.localeCompare(right.due_date);
    }
    return left.created_at.localeCompare(right.created_at);
  });
}

export function StudentSppDetailsPanel({
  spp,
  payments: initialPayments,
  schedules: initialSchedules,
  adjustment,
}: StudentSppDetailsPanelProps) {
  const payments = sortPayments(initialPayments);
  const schedules = sortSchedules(initialSchedules);
  const scheduledTotal = schedules.reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );
  const scheduleTarget = Math.max(0, Number(spp.remaining_amount));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.STUDENT_PAYMENTS} prefetch={false}>
              My payments
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{spp.payment_phase_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>{spp.payment_phase_name}</CardTitle>
          <CardAction className="flex flex-wrap items-center gap-2">
            <SppStatusBadge
              status={resolveSppDisplayStatus(
                { status: spp.status, totalPaid: spp.total_paid },
                {
                  upfrontWindowActive: spp.upfront_window_active,
                  upfrontAmount: spp.phase_upfront_amount,
                }
              )}
            />
            <SppCurrentBadge clearance={spp.current_clearance} />
            <PaymentPhaseStatusBadge status={spp.payment_phase_status} />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex max-w-[16rem] items-center truncate rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
              Semester · {spp.semester_name}
            </span>
            {spp.billing_class_name ? (
              <span className="inline-flex max-w-[16rem] items-center truncate rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
                Class · {spp.billing_class_name}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <UserStatCard
          label="Original"
          value={formatPaymentPhaseMoney(spp.original_amount)}
          accentClassName="border-l-sky-500"
        />
        <UserStatCard
          label="Adjustment"
          value={formatPaymentPhaseMoney(spp.adjustment_amount)}
          accentClassName="border-l-violet-500"
        />
        <UserStatCard
          label="Due"
          value={formatPaymentPhaseMoney(spp.final_amount_due)}
          accentClassName="border-l-amber-500"
        />
        <UserStatCard
          label="Paid"
          value={formatPaymentPhaseMoney(spp.total_paid)}
          accentClassName="border-l-emerald-500"
        />
        <div
          className={cn(
            "rounded-xl bg-card py-4 pl-4 pr-5 ring-1 ring-foreground/10 border-l-4 border-l-rose-500"
          )}
        >
          <p className="text-sm text-muted-foreground">Remaining</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight tabular-nums">
            {formatPaymentPhaseMoney(spp.remaining_amount)}
            {spp.has_credit ? (
              <span className="inline-flex items-center rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                Credit
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <Card className="py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Received by</th>
                  <th className="px-4 py-3 font-medium">Management</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        {format(new Date(payment.payment_date), "MMM d, yyyy")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatPaymentPhaseMoney(payment.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {
                          PAYMENT_METHOD_LABELS[
                            payment.payment_method as PaymentMethod
                          ]
                        }
                      </td>
                      <td className="max-w-[10rem] px-4 py-3">
                        {truncateText(payment.received_by, 24).display}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {payment.received_by_management ? "Yes" : "No"}
                      </td>
                      <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                        {truncateText(payment.notes ?? "—", 24).display}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="border-b py-3">
          <div className="space-y-1">
            <CardTitle>Payment schedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              Scheduled {formatPaymentPhaseMoney(scheduledTotal)} of{" "}
              {formatPaymentPhaseMoney(scheduleTarget)} remaining
              {spp.total_paid > 0 ? (
                <> ({formatPaymentPhaseMoney(spp.total_paid)} already paid)</>
              ) : null}
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No schedule rows yet.
                    </td>
                  </tr>
                ) : (
                  schedules.map((schedule) => (
                    <tr
                      key={schedule.id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        {format(new Date(schedule.due_date), "MMM d, yyyy")}
                      </td>
                      <td className="max-w-[12rem] px-4 py-3">
                        {truncateText(schedule.label, 28).display}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatPaymentPhaseMoney(schedule.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <PaymentScheduleStatusBadge
                          status={schedule.status}
                          isOverdue={schedule.is_overdue}
                        />
                      </td>
                      <td className="max-w-[12rem] px-4 py-3 text-muted-foreground">
                        {truncateText(schedule.notes ?? "—", 28).display}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial adjustment</CardTitle>
        </CardHeader>
        <CardContent>
          {!adjustment ? (
            <p className="text-sm text-muted-foreground">
              No financial adjustment on this student payment phase.
            </p>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium">
                  {
                    FINANCIAL_ADJUSTMENT_TYPE_LABELS[
                      adjustment.type as FinancialAdjustmentType
                    ]
                  }
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Value type</dt>
                <dd className="font-medium">
                  {
                    FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS[
                      adjustment.value_type as FinancialAdjustmentValueType
                    ]
                  }
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Value</dt>
                <dd className="font-medium tabular-nums">
                  {formatAdjustmentValue(
                    adjustment.value_type as FinancialAdjustmentValueType,
                    adjustment.value
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Effective date</dt>
                <dd className="font-medium">
                  {format(new Date(adjustment.effective_date), "MMM d, yyyy")}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Reason</dt>
                <dd className="font-medium">{adjustment.reason ?? "—"}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
