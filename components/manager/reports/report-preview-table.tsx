"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReportEmptyState } from "@/components/manager/reports/report-empty-state";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ReportColumn, ReportRow } from "@/types/manager-reports";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const CELL_MAX_LENGTH = 32;

type ReportPreviewTableProps = {
  columns: ReportColumn[];
  rows: ReportRow[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  printMode?: boolean;
  className?: string;
};

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage !== undefined && page - previousPage > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });

  return result;
}

function formatCellValue(value: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}

function ReportCell({ value }: { value: string | number | null }) {
  const formatted = formatCellValue(value);
  const { display, isTruncated } = truncateText(formatted, CELL_MAX_LENGTH);

  if (!isTruncated) {
    return <span className="block truncate">{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="block cursor-default truncate" tabIndex={0} />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{formatted}</TooltipContent>
    </Tooltip>
  );
}

export function ReportPreviewTable({
  columns,
  rows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  printMode = false,
  className,
}: ReportPreviewTableProps) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const displayRows = printMode
    ? rows
    : rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageNumbers = getPageNumbers(safePage, totalPages);
  const rangeStart = rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = printMode
    ? rows.length
    : Math.min(safePage * pageSize, rows.length);

  if (rows.length === 0) {
    return <ReportEmptyState />;
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 font-medium text-muted-foreground",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center"
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr
                key={`${rowIndex}-${columns.map((c) => row[c.key]).join("-")}`}
                className="border-b last:border-b-0"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "max-w-[12rem] px-4 py-3 tabular-nums",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center"
                    )}
                  >
                    <ReportCell value={row[column.key] ?? null} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!printMode ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {rows.length}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                if (value) {
                  onPageSizeChange(Number(value));
                }
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            {pageNumbers.map((pageNumber, index) =>
              pageNumber === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1 text-sm text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <Button
                  key={pageNumber}
                  type="button"
                  variant={pageNumber === safePage ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => onPageChange(pageNumber)}
                >
                  {pageNumber}
                </Button>
              )
            )}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
