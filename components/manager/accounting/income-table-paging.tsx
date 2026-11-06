"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const INCOME_TABLE_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export type IncomeTablePageSize =
  (typeof INCOME_TABLE_PAGE_SIZE_OPTIONS)[number];

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
}

export function usePagedRows<T>(rows: T[]) {
  const [pageSize, setPageSize] = useState<IncomeTablePageSize>(10);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [pageSize, rows, safePage]);

  return {
    pageSize,
    setPageSize,
    page: safePage,
    setPage,
    pagedRows,
  };
}

type IncomeTablePaginationProps = {
  totalCount: number;
  pageSize: IncomeTablePageSize;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: IncomeTablePageSize) => void;
};

export function IncomeTablePagination({
  totalCount,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
}: IncomeTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const from =
    totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const to = Math.min(safeCurrentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          Showing {from}–{to} of {totalCount}
        </span>
        <span aria-hidden="true">·</span>
        <div className="flex items-center gap-2">
          <span>Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              if (value == null) return;
              onPageSizeChange(Number(value) as IncomeTablePageSize);
            }}
          >
            <SelectTrigger
              size="sm"
              className="w-16"
              aria-label="Rows per page"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {INCOME_TABLE_PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </Button>
        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1 text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={page}
              type="button"
              variant={page === safeCurrentPage ? "default" : "outline"}
              size="icon-sm"
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={page === safeCurrentPage ? "page" : undefined}
            >
              {page}
            </Button>
          )
        )}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={safeCurrentPage >= totalPages}
          onClick={() =>
            onPageChange(Math.min(totalPages, safeCurrentPage + 1))
          }
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
