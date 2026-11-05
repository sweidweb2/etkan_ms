"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";
import { loadInstructorScheduleSlotsPageAction } from "@/app/manager/instructor-schedules/actions";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import {
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS,
  INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type {
  ManagerInstructorScheduleSession,
  ManagerInstructorScheduleSlotsDetailsData,
} from "@/types/manager-instructor-schedule";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const FILTER_ALL = "all";

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type SlotRow = ManagerInstructorScheduleSession & {
  entityLabel: string;
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

function formatAnchorDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

type InstructorScheduleSlotsDetailsPanelProps = {
  data: ManagerInstructorScheduleSlotsDetailsData;
};

export function InstructorScheduleSlotsDetailsPanel({
  data,
}: InstructorScheduleSlotsDetailsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const skipNextFetch = useRef(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [slotTypeFilter, setSlotTypeFilter] = useState<string>(FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    (PAGE_SIZE_OPTIONS.includes(
      data.pageSize as (typeof PAGE_SIZE_OPTIONS)[number]
    )
      ? data.pageSize
      : 10) as (typeof PAGE_SIZE_OPTIONS)[number]
  );
  const [currentPage, setCurrentPage] = useState(data.page);
  const [sessions, setSessions] = useState(data.sessions);
  const [totalCount, setTotalCount] = useState(data.totalCount);

  const entityLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const instructor of data.instructors) {
      map.set(
        `${ENTITY_SCHEDULE_TYPE_INSTRUCTOR}:${instructor.id}`,
        instructor.username?.trim() || "Unknown"
      );
    }
    return map;
  }, [data.instructors]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void loadInstructorScheduleSlotsPageAction({
        page: currentPage,
        pageSize,
        entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        type: slotTypeFilter,
        search: debouncedSearch,
      }).then((result) => {
        if (cancelled) {
          return;
        }
        setSessions(result.sessions);
        setTotalCount(result.totalCount);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [currentPage, pageSize, slotTypeFilter, debouncedSearch]);

  const rows = useMemo<SlotRow[]>(
    () =>
      sessions.map((session) => ({
        ...session,
        entityLabel:
          entityLabelByKey.get(`${session.entityType}:${session.recordId}`) ??
          "Unknown",
      })),
    [sessions, entityLabelByKey]
  );

  const stats = data.stats;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, totalCount);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  function handleSlotTypeFilterChange(value: string | null) {
    setSlotTypeFilter(value ?? FILTER_ALL);
    setCurrentPage(1);
  }

  function handlePageSizeChange(value: string | null) {
    if (!value) {
      return;
    }
    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title="Schedule slot details" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_INSTRUCTOR_SCHEDULES}>
              Instructor schedules
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Slot details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-end gap-2 empty:hidden">
        <Link
          href={ROUTES.MANAGER_INSTRUCTOR_SCHEDULES}
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          <CalendarDaysIcon data-icon="inline-start" />
          Open calendar
        </Link>
      </div>

      <div className="grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-4">
        <UserStatCard
          label="Total slots"
          value={stats.total}
          accentClassName="border-l-sky-500"
        />
        <UserStatCard
          label="Free"
          value={stats.free}
          accentClassName="border-l-emerald-500"
        />
        <UserStatCard
          label="Busy"
          value={stats.busy}
          accentClassName="border-l-rose-500"
        />
        <UserStatCard
          label="Instructor slots"
          value={stats.instructorSlots}
          accentClassName="border-l-violet-500"
        />
      </div>

      <Card className="py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Schedule slots</CardTitle>
          <CardAction className="self-center text-sm text-muted-foreground">
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <InlineSpinner />
                Loading…
              </span>
            ) : (
              <>
                {totalCount} match{totalCount === 1 ? "" : "es"}
              </>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 @2xl/panel:flex-row @2xl/panel:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by slot name…"
                className="pl-8"
                aria-label="Search schedule slots"
              />
            </div>
            <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-center">
              <Select
                value={slotTypeFilter}
                onValueChange={handleSlotTypeFilterChange}
              >
                <SelectTrigger
                  className="w-full @lg/panel:w-40"
                  aria-label="Filter by slot type"
                >
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={FILTER_ALL}>All types</SelectItem>
                  {INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              size="sm"
              className="m-4"
              icon={SearchIcon}
              title="No schedule slots match your filters"
              description="Try a different search or slot type."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Instructor</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Weekday</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Color</th>
                    <th className="px-4 py-3 font-medium">Anchor date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="max-w-[12rem] truncate px-4 py-3 font-medium">
                        {row.name}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3">
                        {row.entityLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS[row.type]}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {WEEKDAY_LABELS[row.dayOfWeek] ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                        {row.startTime}–{row.endTime}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="size-3.5 shrink-0 rounded-full ring-1 ring-foreground/15"
                            style={{ backgroundColor: row.color }}
                            aria-hidden
                          />
                          <span className="font-mono text-xs text-muted-foreground">
                            {row.color}
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatAnchorDate(row.slotDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {rangeStart}–{rangeEnd} of {totalCount}
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
                disabled={safeCurrentPage <= 1 || isPending}
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
                    disabled={isPending}
                    onClick={() => setCurrentPage(page)}
                    aria-label={`Page ${page}`}
                    aria-current={
                      page === safeCurrentPage ? "page" : undefined
                    }
                  >
                    {page}
                  </Button>
                )
              )}

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={safeCurrentPage >= totalPages || isPending}
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
  );
}
