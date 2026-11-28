"use client";

import { useMemo, useState } from "react";
import { getPageNumbers } from "@/lib/pagination/page-numbers";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_MAX_PAGES = 20;

type UseClientPagedRowsOptions = {
  pageSize?: number;
  maxPages?: number;
};

/**
 * Client-side slice + page controls for in-memory tables that are not
 * server-paginated. Caps DOM size so large rosters stay usable.
 */
export function useClientPagedRows<T>(
  rows: readonly T[],
  options?: UseClientPagedRowsOptions
) {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES;
  const [currentPage, setCurrentPage] = useState(1);

  const cappedRows = useMemo(
    () => rows.slice(0, pageSize * maxPages),
    [rows, pageSize, maxPages]
  );
  const isOverPageCap = rows.length > cappedRows.length;
  const totalPages = Math.max(
    1,
    Math.min(maxPages, Math.ceil(cappedRows.length / pageSize) || 1)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageRows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return cappedRows.slice(startIndex, startIndex + pageSize);
  }, [cappedRows, pageSize, safeCurrentPage]);
  const pageNumbers = useMemo(
    () => getPageNumbers(safeCurrentPage, totalPages),
    [safeCurrentPage, totalPages]
  );
  const rangeStart =
    cappedRows.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, cappedRows.length);

  return {
    pageRows,
    currentPage: safeCurrentPage,
    setCurrentPage,
    totalPages,
    pageNumbers,
    rangeStart,
    rangeEnd,
    visibleCount: cappedRows.length,
    totalCount: rows.length,
    isOverPageCap,
    maxVisible: pageSize * maxPages,
    showPagination: cappedRows.length > pageSize || isOverPageCap,
  };
}
