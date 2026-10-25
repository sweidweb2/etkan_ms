"use client";

import Link from "next/link";
import { useState } from "react";
import { EyeIcon, ImportIcon } from "lucide-react";
import { loadImportableAdjustmentsAction } from "@/app/manager/accounting/actions";
import { Can } from "@/components/auth/can";
import { ImportFinancialAdjustmentDialog } from "@/components/manager/accounting/import-financial-adjustment-dialog";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerAccountingSppDetailRoute,
  getManagerStudentDetailRoute,
} from "@/lib/constants/routes";
import type { SppDisplayStatus } from "@/lib/constants/manager-payment-phase-display";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerImportableAdjustmentRow,
  ManagerMissingPriorAdjustmentRow,
} from "@/types/manager-financial-adjustment";

type MissingPriorAdjustmentClientProps = {
  initialRows: ManagerMissingPriorAdjustmentRow[];
};

function TruncatedCell({
  value,
  maxLength,
  className,
}: {
  value: string;
  maxLength: number;
  className?: string;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  if (!isTruncated) {
    return <span className={cn("block truncate", className)}>{display}</span>;
  }

  return (
    <span className={cn("block truncate", className)} title={value}>
      {display}
    </span>
  );
}

export function MissingPriorAdjustmentClient({
  initialRows,
}: MissingPriorAdjustmentClientProps) {
  const [rows, setRows] = useState(initialRows);
  const [prevRows, setPrevRows] = useState(initialRows);
  const [activeRow, setActiveRow] =
    useState<ManagerMissingPriorAdjustmentRow | null>(null);
  const [candidates, setCandidates] = useState<ManagerImportableAdjustmentRow[]>(
    []
  );
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  if (initialRows !== prevRows) {
    setPrevRows(initialRows);
    setRows(initialRows);
  }

  function handleImportClick(row: ManagerMissingPriorAdjustmentRow) {
    setActiveRow(row);
    setCandidates([]);
    setIsLoadingCandidates(true);
    setIsImportOpen(true);

    void (async () => {
      try {
        const next = await loadImportableAdjustmentsAction(
          row.student_id,
          row.spp_id
        );
        setCandidates(next);
      } catch {
        setCandidates([]);
      } finally {
        setIsLoadingCandidates(false);
      }
    })();
  }

  return (
    <>
      <ImportFinancialAdjustmentDialog
        open={isImportOpen}
        onOpenChange={(open) => {
          setIsImportOpen(open);
          if (!open) {
            setActiveRow(null);
            setCandidates([]);
            setIsLoadingCandidates(false);
          }
        }}
        sppId={activeRow?.spp_id ?? ""}
        candidates={candidates}
        isLoadingCandidates={isLoadingCandidates}
        onImported={() => {
          if (activeRow) {
            setRows((current) =>
              current.filter((row) => row.spp_id !== activeRow.spp_id)
            );
          }
          setActiveRow(null);
          setCandidates([]);
          setIsImportOpen(false);
        }}
      />

      <div className="overflow-x-auto overflow-hidden rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Phase</th>
              <th className="px-4 py-3 font-medium">Semester</th>
              <th className="px-4 py-3 font-medium">SPP status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No students need a prior adjustment imported.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.spp_id} className="border-b last:border-b-0">
                  <td className="max-w-[12rem] px-4 py-3 font-medium">
                    <TruncatedCell value={row.student_label} maxLength={28} />
                  </td>
                  <td className="max-w-[12rem] px-4 py-3">
                    <TruncatedCell
                      value={row.payment_phase_name}
                      maxLength={28}
                    />
                  </td>
                  <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                    <TruncatedCell value={row.semester_name} maxLength={24} />
                  </td>
                  <td className="px-4 py-3">
                    <SppStatusBadge
                      status={row.spp_status as SppDisplayStatus}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Can
                        permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_CREATE}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleImportClick(row)}
                        >
                          <ImportIcon data-icon="inline-start" />
                          Import
                        </Button>
                      </Can>
                      {row.student_profile_id ? (
                        <Button
                          render={
                            <Link
                              href={getManagerStudentDetailRoute(
                                row.student_profile_id
                              )}
                              prefetch={false}
                            />
                          }
                          nativeButton={false}
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`View ${row.student_label}`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <EyeIcon />
                        </Button>
                      ) : null}
                      <Button
                        render={
                          <Link
                            href={getManagerAccountingSppDetailRoute(
                              row.payment_phase_id,
                              row.spp_id
                            )}
                            prefetch={false}
                          />
                        }
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
