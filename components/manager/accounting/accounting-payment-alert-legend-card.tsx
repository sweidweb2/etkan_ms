"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  ACCOUNTING_PAYMENT_ALERT_MIN_AMOUNT,
  ACCOUNTING_PAYMENT_MISSED_MONTH_BADGE_CLASSES,
  ACCOUNTING_PAYMENT_MISSED_MONTH_LABELS,
  ACCOUNTING_PAYMENT_MISSED_MONTH_LEVELS,
} from "@/lib/constants/manager-accounting-payment-alert";
import { cn } from "@/lib/utils";

export function AccountingPaymentAlertLegendCard() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="overflow-hidden rounded-xl border bg-muted/20">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200",
          open && "border-b",
          "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Payment alert legend</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How Complex, special-case, under-$
            {ACCOUNTING_PAYMENT_ALERT_MIN_AMOUNT}, and L1–L6 alerts are shown.
          </p>
        </div>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-in-out",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Alerts evaluate open billing subscriptions (status pending). More
              than one open subscription is Complex. A single open subscription
              uses special-case, schedule, under-$
              {ACCOUNTING_PAYMENT_ALERT_MIN_AMOUNT}, and L1–L6 rules.
            </p>

            <p className="mt-3 text-xs font-medium text-foreground">
              Account-level
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-fuchsia-500/15 px-2 py-0.5 text-xs font-medium text-fuchsia-800 dark:text-fuchsia-200">
                Complex
              </span>
              <span className="self-center text-xs text-muted-foreground">
                More than one pending / open subscription
              </span>
            </div>

            <p className="mt-3 text-xs font-medium text-foreground">
              Special case (single open)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                Done
              </span>
              <span className="self-center text-xs text-muted-foreground">
                Paid covers special-case amount
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                Scheduled
              </span>
              <span className="inline-flex items-center rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-800 dark:text-rose-200">
                Missed
              </span>
            </div>

            <p className="mt-3 text-xs font-medium text-foreground">
              Standard (no special case)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-800 dark:text-sky-200">
                Under ${ACCOUNTING_PAYMENT_ALERT_MIN_AMOUNT}
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                Scheduled
              </span>
              <span className="inline-flex items-center rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-800 dark:text-rose-200">
                Missed
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ACCOUNTING_PAYMENT_MISSED_MONTH_LEVELS.map((level) => (
                <div key={level} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "inline-flex min-w-8 items-center justify-center rounded-md px-2 py-0.5 font-medium",
                      ACCOUNTING_PAYMENT_MISSED_MONTH_BADGE_CLASSES[level]
                    )}
                  >
                    L{level}
                  </span>
                  <span className="text-muted-foreground">
                    {ACCOUNTING_PAYMENT_MISSED_MONTH_LABELS[level]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
