"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareTextIcon,
  SearchIcon,
} from "lucide-react";
import { AuditLogActionBadge } from "@/components/manager/logs/audit-log-action-badge";
import { LogDetailsDialog } from "@/components/manager/logs/log-details-dialog";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AUDIT_LOG_ACTION_LABELS,
  AUDIT_LOG_ACTION_VALUES,
} from "@/lib/constants/manager-audit-log-display";
import { MANAGER_AUDIT_LOGS_MOCK } from "@/lib/constants/manager-audit-logs-mock";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerAuditLogRow } from "@/types/manager-audit-log";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const ACTION_FILTER_ALL = "all";
const TABLE_FILTER_ALL = "all";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const COLUMN_LIMITS = {
  userLabel: 24,
  tableName: 20,
  recordId: 12,
  changeSummary: 40,
} as const;

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
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("block cursor-default truncate", className)}
            tabIndex={0}
          />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

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

function getChangeSummary(log: ManagerAuditLogRow): string {
  const changedFields = log.metadata?.changed_fields;
  if (Array.isArray(changedFields) && changedFields.length > 0) {
    const fields = changedFields
      .filter((field): field is string => typeof field === "string")
      .join(", ");
    return `Updated fields: ${fields}`;
  }

  if (log.action === "insert" && log.new_data) {
    const keys = Object.keys(log.new_data);
    return `Inserted record with ${keys.length} field(s)`;
  }

  if (log.action === "delete") {
    return `Deleted record from ${log.table_name ?? "table"}`;
  }

  if (log.action === "export" && log.new_data) {
    const fileName = log.new_data.file_name;
    if (typeof fileName === "string") {
      return `Exported ${fileName}`;
    }
    return "Export completed";
  }

  if (log.action === "login" || log.action === "logout") {
    return `${AUDIT_LOG_ACTION_LABELS[log.action]} event`;
  }

  if (typeof log.metadata?.note === "string") {
    return log.metadata.note;
  }

  return AUDIT_LOG_ACTION_LABELS[log.action];
}

function formatRecordId(recordId: string | null) {
  if (!recordId) {
    return "—";
  }

  return recordId;
}

function matchesSearch(log: ManagerAuditLogRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    log.user_label,
    log.table_name ?? "",
    log.record_id ?? "",
    log.action,
    getChangeSummary(log),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function matchesActionFilter(log: ManagerAuditLogRow, actionFilter: string) {
  if (actionFilter === ACTION_FILTER_ALL) {
    return true;
  }

  return log.action === actionFilter;
}

function matchesTableFilter(log: ManagerAuditLogRow, tableFilter: string) {
  if (tableFilter === TABLE_FILTER_ALL) {
    return true;
  }

  return log.table_name === tableFilter;
}

export function ManageLogsPanel() {
  const [logs] = useState(MANAGER_AUDIT_LOGS_MOCK);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState(ACTION_FILTER_ALL);
  const [tableFilter, setTableFilter] = useState(TABLE_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsLog, setDetailsLog] = useState<ManagerAuditLogRow | null>(null);

  const tableOptions = useMemo(() => {
    const names = new Set<string>();
    logs.forEach((log) => {
      if (log.table_name) {
        names.add(log.table_name);
      }
    });
    return [...names].sort();
  }, [logs]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: logs.length,
      last24Hours: logs.filter(
        (log) => now - new Date(log.created_at).getTime() <= TWENTY_FOUR_HOURS_MS
      ).length,
      updates: logs.filter((log) => log.action === "update").length,
      deletes: logs.filter((log) => log.action === "delete").length,
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      return (
        matchesSearch(log, searchQuery) &&
        matchesActionFilter(log, actionFilter) &&
        matchesTableFilter(log, tableFilter)
      );
    });
  }, [actionFilter, logs, searchQuery, tableFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedLogs = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredLogs.slice(startIndex, startIndex + pageSize);
  }, [filteredLogs, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredLogs.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredLogs.length);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleActionFilterChange = (value: string | null) => {
    setActionFilter(value ?? ACTION_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleTableFilterChange = (value: string | null) => {
    setTableFilter(value ?? TABLE_FILTER_ALL);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review audit activity across tables and user actions. Data is mocked
            until backend is connected.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UserStatCard
            label="Total logs"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Last 24 hours"
            value={stats.last24Hours}
            accentClassName="border-l-violet-500"
          />
          <UserStatCard
            label="Updates"
            value={stats.updates}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Deletes"
            value={stats.deletes}
            accentClassName="border-l-rose-500"
          />
        </div>

        <LogDetailsDialog
          log={detailsLog}
          onOpenChange={(open) => {
            if (!open) {
              setDetailsLog(null);
            }
          }}
        />

        <Card className="py-0">
          <CardHeader className="border-b bg-muted/40 py-4">
            <CardTitle>Audit log</CardTitle>
            <CardDescription>
              Filter by action or table, then open a row for full change details.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search actor, table, record, or summary…"
                  className="pl-8"
                  aria-label="Search audit logs"
                />
              </div>
              <Select value={actionFilter} onValueChange={handleActionFilterChange}>
                <SelectTrigger
                  className="w-full sm:w-36"
                  aria-label="Filter by action"
                >
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={ACTION_FILTER_ALL}>All actions</SelectItem>
                  {AUDIT_LOG_ACTION_VALUES.map((action) => (
                    <SelectItem key={action} value={action}>
                      {AUDIT_LOG_ACTION_LABELS[action]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tableFilter} onValueChange={handleTableFilterChange}>
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Filter by table"
                >
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={TABLE_FILTER_ALL}>All tables</SelectItem>
                  {tableOptions.map((tableName) => (
                    <SelectItem key={tableName} value={tableName}>
                      {tableName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Table</th>
                    <th className="px-4 py-3 font-medium">Record</th>
                    <th className="px-4 py-3 font-medium">Summary</th>
                    <th className="px-4 py-3 text-center font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No logs match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const changeSummary = getChangeSummary(log);
                      const recordIdDisplay = formatRecordId(log.record_id);

                      return (
                        <tr
                          key={log.id}
                          className="border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                          </td>
                          <td className="max-w-[9rem] px-4 py-3">
                            <TruncatedCell
                              value={log.user_label}
                              maxLength={COLUMN_LIMITS.userLabel}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <AuditLogActionBadge action={log.action} />
                          </td>
                          <td className="max-w-[8rem] px-4 py-3">
                            <TruncatedCell
                              value={log.table_name ?? "—"}
                              maxLength={COLUMN_LIMITS.tableName}
                            />
                          </td>
                          <td className="max-w-[7rem] px-4 py-3 font-mono text-xs text-muted-foreground">
                            <TruncatedCell
                              value={recordIdDisplay}
                              maxLength={COLUMN_LIMITS.recordId}
                            />
                          </td>
                          <td className="max-w-[12rem] px-4 py-3 text-muted-foreground">
                            <TruncatedCell
                              value={changeSummary}
                              maxLength={COLUMN_LIMITS.changeSummary}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label="View log details"
                              onClick={() => setDetailsLog(log)}
                              className="text-primary hover:bg-primary/10 hover:text-primary"
                            >
                              <MessageSquareTextIcon className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {filteredLogs.length}
                </span>
                <span aria-hidden="true">·</span>
                <div className="flex items-center gap-2">
                  <span>Rows</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-16"
                      aria-label="Rows per page"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
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
                  onClick={() => setCurrentPage((page) => page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon />
                </Button>

                {pageNumbers.map((page, index) =>
                  page === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1 text-sm text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={page}
                      type="button"
                      variant={page === safeCurrentPage ? "default" : "outline"}
                      size="icon-sm"
                      className="min-w-7"
                      onClick={() => setCurrentPage(page)}
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
                  onClick={() => setCurrentPage((page) => page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
