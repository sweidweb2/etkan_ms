"use client";

import { TriangleAlertIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ACCOUNTING_PAYMENT_ALERT_MIN_AMOUNT,
  ACCOUNTING_PAYMENT_ALERT_REASON_LABELS,
  ACCOUNTING_PAYMENT_MISSED_MONTH_BADGE_CLASSES,
} from "@/lib/constants/manager-accounting-payment-alert";
import { cn } from "@/lib/utils";
import type { ManagerAccountingPaymentAlertReason } from "@/types/manager-student-semester";

const REASON_BADGE_CLASSES: Partial<
  Record<ManagerAccountingPaymentAlertReason, string>
> = {
  complex: "bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-200",
  done: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  scheduled: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
  missed_schedule: "bg-rose-500/15 text-rose-800 dark:text-rose-200",
  low_payment: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  no_payment_1_month: ACCOUNTING_PAYMENT_MISSED_MONTH_BADGE_CLASSES[1],
  no_payment_2_months: ACCOUNTING_PAYMENT_MISSED_MONTH_BADGE_CLASSES[2],
  no_payment_3_months: ACCOUNTING_PAYMENT_MISSED_MONTH_BADGE_CLASSES[3],
  no_payment_4_months: ACCOUNTING_PAYMENT_MISSED_MONTH_BADGE_CLASSES[4],
  no_payment_5_months: ACCOUNTING_PAYMENT_MISSED_MONTH_BADGE_CLASSES[5],
  no_payment_6_months: ACCOUNTING_PAYMENT_MISSED_MONTH_BADGE_CLASSES[6],
};

const REASON_SHORT_LABELS: Partial<
  Record<ManagerAccountingPaymentAlertReason, string>
> = {
  complex: "Complex",
  done: "Done",
  scheduled: "Scheduled",
  missed_schedule: "Missed",
  low_payment: `Under $${ACCOUNTING_PAYMENT_ALERT_MIN_AMOUNT}`,
  no_payment_1_month: "L1",
  no_payment_2_months: "L2",
  no_payment_3_months: "L3",
  no_payment_4_months: "L4",
  no_payment_5_months: "L5",
  no_payment_6_months: "L6",
};

type AccountingPaymentAlertBadgeProps = {
  reasons: ManagerAccountingPaymentAlertReason[];
  className?: string;
};

export function AccountingPaymentAlertBadge({
  reasons,
  className,
}: AccountingPaymentAlertBadgeProps) {
  if (reasons.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {reasons.map((reason) => (
        <Tooltip key={reason}>
          <TooltipTrigger
            render={
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                  REASON_BADGE_CLASSES[reason]
                )}
                tabIndex={0}
                aria-label={ACCOUNTING_PAYMENT_ALERT_REASON_LABELS[reason]}
              />
            }
          >
            {reason !== "done" && reason !== "scheduled" ? (
              <TriangleAlertIcon className="size-3.5 shrink-0" />
            ) : null}
            {REASON_SHORT_LABELS[reason] ??
              ACCOUNTING_PAYMENT_ALERT_REASON_LABELS[reason]}
          </TooltipTrigger>
          <TooltipContent>
            {ACCOUNTING_PAYMENT_ALERT_REASON_LABELS[reason]}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
