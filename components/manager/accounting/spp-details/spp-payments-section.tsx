import { format } from "date-fns";
import { CreditCardIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { TruncatedCell } from "@/components/manager/accounting/spp-details/spp-details-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/manager/accounting/constants";
import type { ManagerSppDetail } from "@/types/manager-student-payment";
import type { ManagerStudentPaymentRow } from "@/types/manager-student-payment";

type SppPaymentsSectionProps = {
  spp: ManagerSppDetail;
  payments: ManagerStudentPaymentRow[];
  onRecordPayment: () => void;
  onEditPayment: (payment: ManagerStudentPaymentRow) => void;
  onDeletePayment: (payment: ManagerStudentPaymentRow) => void;
};

export function SppPaymentsSection({
  spp,
  payments,
  onRecordPayment,
  onEditPayment,
  onDeletePayment,
}: SppPaymentsSectionProps) {
  return (
    <Card className="py-0">
      <CardHeader className="border-b py-3">
        <CardTitle>Payments</CardTitle>
        {!spp.payments_blocked ? (
          <CardAction>
            <Can permission={PERMISSIONS.ACCOUNTING_PAYMENTS_CREATE}>
              <Button type="button" size="sm" onClick={onRecordPayment}>
                <PlusIcon data-icon="inline-start" />
                Record payment
              </Button>
            </Can>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {payments.length === 0 ? (
          <div className="px-4 py-4">
            <EmptyState
              size="sm"
              icon={CreditCardIcon}
              title="No payments recorded yet"
              description="Record a payment to track progress on this assignment."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Received by</th>
                  <th className="px-4 py-3 font-medium">Management</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
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
                      <TruncatedCell
                        value={payment.received_by}
                        maxLength={24}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {payment.received_by_management ? "Yes" : "No"}
                    </td>
                    <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                      <TruncatedCell
                        value={payment.notes ?? "—"}
                        maxLength={24}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!spp.payments_blocked ? (
                          <>
                            <Can
                              permission={PERMISSIONS.ACCOUNTING_PAYMENTS_UPDATE}
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Edit payment"
                                onClick={() => onEditPayment(payment)}
                              >
                                <PencilIcon />
                              </Button>
                            </Can>
                            <Can
                              permission={PERMISSIONS.ACCOUNTING_PAYMENTS_DELETE}
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Delete payment"
                                onClick={() => onDeletePayment(payment)}
                              >
                                <Trash2Icon />
                              </Button>
                            </Can>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
