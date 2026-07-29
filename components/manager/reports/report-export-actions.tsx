"use client";

import { useState } from "react";
import { DownloadIcon, PrinterIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  downloadCsv,
  formatReportFilename,
} from "@/lib/export/download-csv";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { showSuccessToast } from "@/lib/toast";
import type { ReportColumn, ReportId, ReportRow } from "@/types/manager-reports";

type ReportExportActionsProps = {
  reportId: ReportId;
  reportLabel: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  onPrint: () => void;
};

export function ReportExportActions({
  reportId,
  reportLabel,
  columns,
  rows,
  onPrint,
}: ReportExportActionsProps) {
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleExportCsv = async () => {
    if (rows.length === 0) {
      return;
    }

    setIsExportingCsv(true);
    try {
      downloadCsv({
        filename: formatReportFilename(reportId),
        columns,
        rows,
      });
      showSuccessToast(`${reportLabel} exported as CSV.`);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    onPrint();
    window.setTimeout(() => setIsPrinting(false), 500);
  };

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Can permission={PERMISSIONS.REPORTS_EXPORT}>
        <Button
          type="button"
          variant="outline"
          disabled={rows.length === 0 || isExportingCsv}
          onClick={handleExportCsv}
        >
          {isExportingCsv ? (
            <InlineSpinner className="mr-2" />
          ) : (
            <DownloadIcon data-icon="inline-start" />
          )}
          Export CSV
        </Button>
      </Can>
      <Can permission={PERMISSIONS.REPORTS_PRINT}>
        <Button
          type="button"
          variant="outline"
          disabled={rows.length === 0 || isPrinting}
          onClick={handlePrint}
        >
          {isPrinting ? (
            <InlineSpinner className="mr-2" />
          ) : (
            <PrinterIcon data-icon="inline-start" />
          )}
          Print / PDF
        </Button>
      </Can>
    </div>
  );
}
