"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowRightIcon, BarChart3Icon, DatabaseBackupIcon } from "lucide-react";
import { ReportCategoryTabs } from "@/components/manager/reports/report-category-tabs";
import { ReportExportActions } from "@/components/manager/reports/report-export-actions";
import { ReportFilterBar } from "@/components/manager/reports/report-filter-bar";
import { ReportPreviewTable } from "@/components/manager/reports/report-preview-table";
import { ReportTypeSelect } from "@/components/manager/reports/report-type-select";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getDefaultReportForCategory,
  getReportDefinition,
  getReportsByCategory,
} from "@/lib/constants/manager-report-definitions";
import {
  DEFAULT_REPORT_CLASS_ID,
  DEFAULT_REPORT_STUDENT_ID,
  getReportRows,
} from "@/lib/constants/manager-reports-mock";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import {
  DEFAULT_REPORT_FILTERS,
  type ReportCategory,
  type ReportFilters,
  type ReportId,
} from "@/types/manager-reports";

const INITIAL_CATEGORY: ReportCategory = "student";
const INITIAL_REPORT_ID = getDefaultReportForCategory(INITIAL_CATEGORY);

export function ManagerReportsPanel() {
  const [category, setCategory] = useState<ReportCategory>(INITIAL_CATEGORY);
  const [reportId, setReportId] = useState<ReportId>(INITIAL_REPORT_ID);
  const [filters, setFilters] = useState<ReportFilters>({
    ...DEFAULT_REPORT_FILTERS,
    studentId: DEFAULT_REPORT_STUDENT_ID,
    classId: DEFAULT_REPORT_CLASS_ID,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isPrinting, setIsPrinting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());

  const categoryReports = useMemo(
    () => getReportsByCategory(category),
    [category]
  );

  const activeReport = useMemo(
    () => getReportDefinition(reportId),
    [reportId]
  );

  const rows = useMemo(() => {
    return getReportRows(reportId, filters);
  }, [reportId, filters]);

  useEffect(() => {
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const handleCategoryChange = (nextCategory: ReportCategory) => {
    setCategory(nextCategory);
    const nextReportId = getDefaultReportForCategory(nextCategory);
    setReportId(nextReportId);
    setPage(1);
    setGeneratedAt(new Date());
  };

  const handleReportChange = (nextReportId: ReportId) => {
    setReportId(nextReportId);
    setPage(1);
    setGeneratedAt(new Date());
  };

  const handleFiltersChange = (nextFilters: ReportFilters) => {
    setFilters(nextFilters);
    setPage(1);
    setGeneratedAt(new Date());
  };

  const handlePrint = () => {
    setIsPrinting(true);
    window.requestAnimationFrame(() => {
      window.print();
    });
  };

  const showBackupLink = reportId === "backup_history";
  const showAuditNote = reportId === "audit_trail";

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Structured, exportable reports for students, classes, finances,
          equipment, and operations.
        </p>
      </div>

      <div className="grid gap-4 print:hidden md:grid-cols-3">
        <ReportCategoryTabs
          value={category}
          onChange={handleCategoryChange}
        />
        <ReportTypeSelect
          reports={categoryReports}
          value={reportId}
          onChange={handleReportChange}
          activeReport={activeReport}
        />
        <ReportFilterBar
          filterKeys={activeReport.filters}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-semibold">{activeReport.label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated {format(generatedAt, "MMM d, yyyy h:mm a")}
        </p>
        <p className="mt-1 text-sm">{activeReport.description}</p>
      </div>

      <Card className="py-0" id="report-print-area">
        <CardHeader className="border-b bg-muted/40 py-4 print:hidden">
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>
            {rows.length} row{rows.length === 1 ? "" : "s"} · Updated{" "}
            {format(generatedAt, "h:mm a")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-4">
          <div className="mb-4 print:hidden">
            <ReportExportActions
              reportId={reportId}
              reportLabel={activeReport.label}
              columns={activeReport.columns}
              rows={rows}
              onPrint={handlePrint}
            />
          </div>

          <ReportPreviewTable
            columns={activeReport.columns}
            rows={rows}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            printMode={isPrinting}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 px-4 py-3 print:hidden">
        {showAuditNote ? (
          <p className="text-xs text-muted-foreground">
            Full audit export is available via Backup for raw table dumps.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Link
            href={ROUTES.MANAGER_ANALYTICS}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5"
            )}
          >
            <BarChart3Icon className="size-3.5" />
            View analytics
            <ArrowRightIcon className="size-3.5" />
          </Link>
          {showBackupLink ? (
            <Link
              href={ROUTES.MANAGER_BACKUP}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1.5"
              )}
            >
              <DatabaseBackupIcon className="size-3.5" />
              Open full backup export
              <ArrowRightIcon className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
