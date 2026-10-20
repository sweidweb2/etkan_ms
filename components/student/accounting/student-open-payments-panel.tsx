"use client";

import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { SppCurrentBadge } from "@/components/manager/accounting/spp-current-badge";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { getStudentPaymentDetailRoute } from "@/lib/constants/routes";
import { resolveSppDisplayStatus } from "@/lib/manager/accounting/spp-display-status";
import { cn } from "@/lib/utils";
import type { StudentOpenSppRow } from "@/types/manager-student-payment";

type StudentOpenPaymentsPanelProps = {
  rows: StudentOpenSppRow[];
};

const OPEN_SPP_ROW_CLASS =
  "cursor-pointer transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)] active:bg-primary/15 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

export function StudentOpenPaymentsPanel({
  rows,
}: StudentOpenPaymentsPanelProps) {
  const router = useRouter();

  const openSppDetails = (sppId: string) => {
    router.push(getStudentPaymentDetailRoute(sppId));
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    sppId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSppDetails(sppId);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open payment phases you belong to. Select a row to see your details.
        </p>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Open payment phases</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table className="min-w-[840px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Phase</TableHead>
                <TableHead className="px-4">Semester</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4 text-right">Due</TableHead>
                <TableHead className="px-4 text-right">Paid</TableHead>
                <TableHead className="px-4 text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="h-24 px-4 text-center text-muted-foreground whitespace-normal"
                  >
                    No open payment phases assigned to you.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(OPEN_SPP_ROW_CLASS)}
                    tabIndex={0}
                    role="link"
                    aria-label={`View payment details for ${row.payment_phase_name}`}
                    onClick={() => openSppDetails(row.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, row.id)}
                  >
                    <TableCell className="max-w-[16rem] px-4 whitespace-normal">
                      <div className="font-medium">{row.payment_phase_name}</div>
                      <div className="mt-1">
                        <PaymentPhaseStatusBadge
                          status={row.payment_phase_status}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground whitespace-normal">
                      {row.semester_name}
                      {row.semester_code ? (
                        <span className="ml-1 text-xs">
                          ({row.semester_code})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <SppStatusBadge
                          status={resolveSppDisplayStatus(
                            {
                              status: row.status,
                              totalPaid: row.total_paid,
                            },
                            {
                              upfrontWindowActive: false,
                              upfrontAmount: 0,
                            }
                          )}
                        />
                        <SppCurrentBadge clearance={row.current_clearance} />
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-right tabular-nums">
                      {formatPaymentPhaseMoney(row.final_amount_due)}
                    </TableCell>
                    <TableCell className="px-4 text-right tabular-nums">
                      {formatPaymentPhaseMoney(row.total_paid)}
                    </TableCell>
                    <TableCell className="px-4 text-right tabular-nums">
                      {formatPaymentPhaseMoney(row.remaining_amount)}
                      {row.has_credit ? (
                        <span className="ml-2 inline-flex items-center rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                          Credit
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
