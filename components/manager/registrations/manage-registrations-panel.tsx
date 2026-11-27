"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  EyeIcon,
  SearchIcon,
} from "lucide-react";
import {
  loadRegistrationsPageAction,
  updateRegistrationStatusAction,
} from "@/app/(panels)/manager/registrations/actions";
import { usePermissions } from "@/components/auth/permissions-provider";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  REGISTRATION_APPLICATION_STATUS_LABELS,
  REGISTRATION_APPLICATION_STATUS_VALUES,
  REGISTRATION_PREFERRED_PROGRAM_LABELS,
  type RegistrationApplicationStatus,
} from "@/lib/constants/public-registration";
import {
  getManagerGuestDetailRoute,
  getManagerRegistrationDetailRoute,
} from "@/lib/constants/routes";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  ManagerRegistrationApplicationRow,
  ManagerRegistrationsListData,
  ManagerRegistrationsListQuery,
  UpdateRegistrationStatusActionState,
} from "@/types/public-registration";

const STATUS_ALL = "all";
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 25;
const initialStatusState: UpdateRegistrationStatusActionState = {};

type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

type ManageRegistrationsPanelProps = {
  initialData: ManagerRegistrationsListData;
};

function statusClassName(status: RegistrationApplicationStatus) {
  if (status === "accepted") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  }
  if (status === "applied") {
    return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
  if (status === "missing") {
    return "bg-orange-500/15 text-orange-800 dark:text-orange-300";
  }
  if (status === "rejected") {
    return "bg-rose-500/15 text-rose-700 dark:text-rose-400";
  }
  return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
}

function listQueryKey(query: {
  status: string;
  search: string;
  page: number;
  pageSize: number;
}) {
  return `${query.status}|${query.search}|${query.page}|${query.pageSize}`;
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

export function ManageRegistrationsPanel({
  initialData,
}: ManageRegistrationsPanelProps) {
  const permissions = usePermissions();
  const [applications, setApplications] = useState(initialData.applications);
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [isLoading, startTransition] = useTransition();
  const canUpdateStatus = hasPermissionInSet(
    permissions,
    PERMISSIONS.REGISTRATIONS_UPDATE_STATUS
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [pageSize, setPageSize] = useState<PageSizeOption>(
    (PAGE_SIZE_OPTIONS as readonly number[]).includes(initialData.pageSize)
      ? (initialData.pageSize as PageSizeOption)
      : DEFAULT_PAGE_SIZE
  );
  const [currentPage, setCurrentPage] = useState(initialData.page);
  const loadedKeyRef = useRef(
    listQueryKey({
      status: STATUS_ALL,
      search: "",
      page: initialData.page,
      pageSize: initialData.pageSize,
    })
  );
  const requestIdRef = useRef(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{
    id: string;
    status: RegistrationApplicationStatus;
  } | null>(null);
  const [statusState, statusAction, isStatusPending] = useActionState(
    updateRegistrationStatusAction,
    initialStatusState
  );
  const [isStatusTransitionPending, startStatusTransition] = useTransition();
  const isStatusBusy = isStatusPending || isStatusTransitionPending;

  useActionStateToast(statusState, isStatusBusy);
  useActionStateSuccess(statusState, isStatusBusy, () => {
    if (pendingStatus) {
      setApplications((current) =>
        current.map((row) =>
          row.id === pendingStatus.id
            ? { ...row, status: pendingStatus.status }
            : row
        )
      );
      setPendingStatus(null);
    }
    setUpdatingId(null);
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, totalCount);

  const loadPage = (query: ManagerRegistrationsListQuery) => {
    const requestId = ++requestIdRef.current;
    startTransition(async () => {
      const data = await loadRegistrationsPageAction(query);
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (!data) {
        showErrorToast("Unable to load registrations.");
        return;
      }
      setApplications(data.applications);
      setTotalCount(data.totalCount);
      if (data.page !== query.page) {
        loadedKeyRef.current = listQueryKey({
          status: query.status ?? STATUS_ALL,
          search: query.search ?? "",
          page: data.page,
          pageSize: data.pageSize,
        });
        setCurrentPage(data.page);
      }
    });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchQuery.trim();
      if (next !== debouncedSearch) {
        setDebouncedSearch(next);
        setCurrentPage(1);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [debouncedSearch, searchQuery]);

  useEffect(() => {
    const key = listQueryKey({
      status: statusFilter,
      search: debouncedSearch,
      page: currentPage,
      pageSize,
    });
    if (key === loadedKeyRef.current) {
      return;
    }
    loadedKeyRef.current = key;
    loadPage({
      page: currentPage,
      pageSize,
      status:
        statusFilter === STATUS_ALL
          ? null
          : (statusFilter as RegistrationApplicationStatus),
      search: debouncedSearch,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, pageSize, statusFilter]);

  function changeStatus(
    row: ManagerRegistrationApplicationRow,
    nextStatus: RegistrationApplicationStatus
  ) {
    if (!canUpdateStatus || nextStatus === row.status) return;
    setUpdatingId(row.id);
    setPendingStatus({ id: row.id, status: nextStatus });
    const formData = new FormData();
    formData.set("id", row.id);
    formData.set("status", nextStatus);
    startStatusTransition(() => {
      statusAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title="Registrations" />

      <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, phone…"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value ?? STATUS_ALL);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full @lg/panel:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
            {REGISTRATION_APPLICATION_STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {REGISTRATION_APPLICATION_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          size="sm"
          className={cn(isLoading && "opacity-60")}
          icon={totalCount === 0 ? ClipboardListIcon : SearchIcon}
          title={
            totalCount === 0
              ? "No applications yet"
              : "No applications match your filters"
          }
          description={
            totalCount === 0
              ? "Registration applications will appear here."
              : "Try a different search or status filter."
          }
        />
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-xl ring-1 ring-foreground/10",
            isLoading && "opacity-60"
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Program</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {applications.map((row) => {
                  const rowBusy = isStatusBusy && updatingId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {format(new Date(row.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{row.full_name}</span>
                          {row.guest_id ? (
                            <Link
                              href={getManagerGuestDetailRoute(row.guest_id)}
                              className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            >
                              Guest
                            </Link>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3">
                        {REGISTRATION_PREFERRED_PROGRAM_LABELS[
                          row.preferred_program
                        ] ?? row.preferred_program}
                      </td>
                      <td className="px-4 py-3">
                        {canUpdateStatus ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={row.status}
                              onValueChange={(value) => {
                                if (value) {
                                  changeStatus(
                                    row,
                                    value as RegistrationApplicationStatus
                                  );
                                }
                              }}
                              disabled={rowBusy}
                            >
                              <SelectTrigger className="h-8 w-[8.5rem]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {REGISTRATION_APPLICATION_STATUS_VALUES.map(
                                  (value) => (
                                    <SelectItem key={value} value={value}>
                                      {
                                        REGISTRATION_APPLICATION_STATUS_LABELS[
                                          value
                                        ]
                                      }
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            {rowBusy ? <InlineSpinner /> : null}
                          </div>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              statusClassName(row.status)
                            )}
                          >
                            {REGISTRATION_APPLICATION_STATUS_LABELS[row.status]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={getManagerRegistrationDetailRoute(row.id)}
                          prefetch={false}
                          aria-label={`View ${row.full_name}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                        >
                          <EyeIcon className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t px-4 py-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                Showing {rangeStart}–{rangeEnd} of {totalCount}
                {isLoading ? <InlineSpinner /> : null}
              </span>
              <span aria-hidden="true">·</span>
              <div className="flex items-center gap-2">
                <span>Rows</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    if (!value) return;
                    setPageSize(Number(value) as PageSizeOption);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger size="sm" className="w-16" aria-label="Rows per page">
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
        </div>
      )}
    </div>
  );
}
