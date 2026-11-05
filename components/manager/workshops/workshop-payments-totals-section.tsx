"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  LandmarkIcon,
  ReceiptIcon,
  ScaleIcon,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  WORKSHOP_PAYMENT_METHOD_LABELS,
  WORKSHOP_PAYMENT_TYPE_LABELS,
  WORKSHOP_PAYMENT_TYPES,
  type WorkshopPaymentMethod,
} from "@/lib/constants/manager-workshop-display";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import {
  getManagerWorkshopDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type {
  ManagerWorkshopPaymentLedgerRow,
  ManagerWorkshopPaymentsTotals,
} from "@/types/manager-workshop";

type WorkshopPaymentsTotalsSectionProps = {
  payments: ManagerWorkshopPaymentLedgerRow[];
  totals: ManagerWorkshopPaymentsTotals;
  totalCount: number;
  page: number;
  pageSize: number;
};

function formatMethod(method: ManagerWorkshopPaymentLedgerRow["payment_method"]) {
  if (!method) {
    return "—";
  }
  if (method in WORKSHOP_PAYMENT_METHOD_LABELS) {
    return WORKSHOP_PAYMENT_METHOD_LABELS[method as WorkshopPaymentMethod];
  }
  return method;
}

function TotalsStatCard({
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
    <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
          iconClassName
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

function pageHref(page: number) {
  if (page <= 1) {
    return ROUTES.MANAGER_WORKSHOPS_PAYMENTS;
  }
  return `${ROUTES.MANAGER_WORKSHOPS_PAYMENTS}?page=${page}`;
}

export function WorkshopPaymentsTotalsSection({
  payments,
  totals,
  totalCount,
  page,
  pageSize,
}: WorkshopPaymentsTotalsSectionProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalCount);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Total payments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All workshop payment ledger entries across offerings.
        </p>
      </div>

      <div className="grid gap-3 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-5">
        <TotalsStatCard
          label="Credits"
          value={formatPaymentPhaseMoney(totals.credits)}
          icon={ArrowUpRightIcon}
          iconClassName="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        />
        <TotalsStatCard
          label="Debits"
          value={formatPaymentPhaseMoney(totals.debits)}
          icon={ArrowDownLeftIcon}
          iconClassName="bg-rose-500/15 text-rose-700 dark:text-rose-400"
        />
        <TotalsStatCard
          label="Net"
          value={formatPaymentPhaseMoney(totals.net)}
          icon={ScaleIcon}
          iconClassName="bg-sky-500/15 text-sky-700 dark:text-sky-400"
        />
        <TotalsStatCard
          label="Payments"
          value={String(totals.payment_count)}
          icon={ReceiptIcon}
          iconClassName="bg-violet-500/15 text-violet-700 dark:text-violet-400"
        />
        <TotalsStatCard
          label="Workshops paid"
          value={String(totals.workshops_with_payments)}
          icon={LandmarkIcon}
          iconClassName="bg-amber-500/15 text-amber-700 dark:text-amber-400"
        />
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="border-b bg-muted/40 px-4 py-3">
          <h3 className="text-sm font-medium">Payment records</h3>
        </div>
        <div className="px-4 py-4">
          {totalCount === 0 ? (
            <EmptyState
              size="sm"
              icon={CreditCardIcon}
              title="No payments recorded across workshops yet"
              description="Workshop payment records will appear here once added."
            />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Date</th>
                      <th className="pb-2 pr-3 font-medium">Workshop</th>
                      <th className="pb-2 pr-3 font-medium">Type</th>
                      <th className="pb-2 pr-3 font-medium">Amount</th>
                      <th className="pb-2 pr-3 font-medium">Method</th>
                      <th className="pb-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => {
                      const isCredit =
                        payment.type === WORKSHOP_PAYMENT_TYPES.CREDIT;
                      return (
                        <tr
                          key={payment.id}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="py-3 pr-3 align-top text-foreground">
                            {format(
                              new Date(payment.payment_date),
                              "MMM d, yyyy"
                            )}
                          </td>
                          <td className="py-3 pr-3 align-top">
                            <Link
                              href={getManagerWorkshopDetailRoute(
                                payment.workshop_id
                              )}
                              className="font-medium text-foreground underline-offset-4 hover:underline"
                            >
                              {payment.workshop_name}
                            </Link>
                          </td>
                          <td className="py-3 pr-3 align-top text-foreground">
                            {WORKSHOP_PAYMENT_TYPE_LABELS[payment.type]}
                          </td>
                          <td
                            className={cn(
                              "py-3 pr-3 align-top font-medium",
                              isCredit
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-rose-700 dark:text-rose-400"
                            )}
                          >
                            {isCredit ? "+" : "−"}
                            {formatPaymentPhaseMoney(payment.amount)}
                          </td>
                          <td className="py-3 pr-3 align-top text-muted-foreground">
                            {formatMethod(payment.payment_method)}
                          </td>
                          <td className="py-3 align-top text-muted-foreground">
                            {payment.notes?.trim() ? payment.notes : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalCount > pageSize ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {rangeStart}–{rangeEnd} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    {safePage <= 1 ? (
                      <Button type="button" variant="outline" size="sm" disabled>
                        <ChevronLeftIcon data-icon="inline-start" />
                        Prev
                      </Button>
                    ) : (
                      <Link
                        href={pageHref(safePage - 1)}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" })
                        )}
                      >
                        <ChevronLeftIcon data-icon="inline-start" />
                        Prev
                      </Link>
                    )}
                    {safePage >= totalPages ? (
                      <Button type="button" variant="outline" size="sm" disabled>
                        Next
                        <ChevronRightIcon data-icon="inline-end" />
                      </Button>
                    ) : (
                      <Link
                        href={pageHref(safePage + 1)}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" })
                        )}
                      >
                        Next
                        <ChevronRightIcon data-icon="inline-end" />
                      </Link>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
