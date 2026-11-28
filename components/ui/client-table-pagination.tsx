"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ClientTablePaginationProps = {
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  visibleCount: number;
  isOverPageCap: boolean;
  maxVisible: number;
  currentPage: number;
  totalPages: number;
  pageNumbers: Array<number | "ellipsis">;
  onPageChange: (page: number) => void;
  className?: string;
};

/** Compact pager for client-sliced tables (grades, exceptions, etc.). */
export function ClientTablePagination({
  rangeStart,
  rangeEnd,
  totalCount,
  visibleCount,
  isOverPageCap,
  maxVisible,
  currentPage,
  totalPages,
  pageNumbers,
  onPageChange,
  className,
}: ClientTablePaginationProps) {
  if (visibleCount === 0) {
    return null;
  }

  return (
    <div
      className={
        className ??
        "flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>
          Showing {rangeStart}–{rangeEnd} of {totalCount}
        </span>
        {isOverPageCap ? (
          <>
            <span aria-hidden="true">·</span>
            <span>
              First {maxVisible.toLocaleString()} shown. Search or filter to
              narrow the list.
            </span>
          </>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1" aria-label="Pagination">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
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
                variant={page === currentPage ? "default" : "outline"}
                size="icon-sm"
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            )
          )}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
