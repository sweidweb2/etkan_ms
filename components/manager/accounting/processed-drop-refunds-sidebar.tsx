"use client";

import { format } from "date-fns";
import { BanknoteIcon, Trash2Icon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerDropRefundPaymentRow } from "@/types/manager-semester-drop";

type ProcessedDropRefundsSidebarProps = {
  payments: ManagerDropRefundPaymentRow[];
  onDeletePayment: (row: ManagerDropRefundPaymentRow) => void;
};

export function ProcessedDropRefundsSidebar({
  payments,
  onDeletePayment,
}: ProcessedDropRefundsSidebarProps) {
  return (
    <aside className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <div>
        <h3 className="text-sm font-medium">Processed refund payments</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Debits from Mark refunded. Delete to remove them from stats.
        </p>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          size="sm"
          icon={BanknoteIcon}
          title="No refund payments"
          description="Marking a drop refund paid adds a debit here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">Student</th>
                <th className="pb-2 pr-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((row) => {
                const name = truncateText(row.student_label, 18).display;
                return (
                  <tr
                    key={row.id}
                    className="border-b last:border-b-0 align-top"
                  >
                    <td className="py-2 pr-2">
                      <p className="font-medium" title={row.student_label}>
                        {name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(`${row.payment_date}T00:00:00`), "MMM d, yyyy")}
                        {row.phase_name ? ` · ${row.phase_name}` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums">
                      {formatPaymentPhaseMoney(row.amount)}
                    </td>
                    <td className="py-2 text-right">
                      <Can permission={PERMISSIONS.ACCOUNTING_PAYMENTS_DELETE}>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Delete refund payment for ${row.student_label}`}
                                onClick={() => onDeletePayment(row)}
                              />
                            }
                          >
                            <Trash2Icon />
                          </TooltipTrigger>
                          <TooltipContent>Delete payment</TooltipContent>
                        </Tooltip>
                      </Can>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </aside>
  );
}
