"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
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
  ENTITY_SCHEDULE_TYPE_LABELS,
  ENTITY_SCHEDULE_TYPE_VALUES,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
  INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS,
  INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type {
  ManagerInstructorScheduleSession,
  ManagerInstructorSchedulesPageData,
  ScheduleEntityType,
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

function matchesSearch(row: SlotRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return (
    row.name.toLowerCase().includes(normalizedQuery) ||
    row.entityLabel.toLowerCase().includes(normalizedQuery) ||
    ENTITY_SCHEDULE_TYPE_LABELS[row.entityType]
      .toLowerCase()
      .includes(normalizedQuery) ||
    INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS[row.type]
      .toLowerCase()
      .includes(normalizedQuery) ||
    (WEEKDAY_LABELS[row.dayOfWeek] ?? "").toLowerCase().includes(normalizedQuery)
  );
}

type InstructorScheduleSlotsDetailsPanelProps = {
  data: ManagerInstructorSchedulesPageData;
};

export function InstructorScheduleSlotsDetailsPanel({
  data,
}: InstructorScheduleSlotsDetailsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>(FILTER_ALL);
  const [slotTypeFilter, setSlotTypeFilter] = useState<string>(FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);

  const entityLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const instructor of data.instructors) {
      map.set(
        `${ENTITY_SCHEDULE_TYPE_INSTRUCTOR}:${instructor.id}`,
        instructor.username?.trim() || "Unknown"
      );
    }
    for (const workshop of data.workshops) {
      map.set(
        `${ENTITY_SCHEDULE_TYPE_WORKSHOP}:${workshop.id}`,
        workshop.name
      );
    }
    return map;
  }, [data.instructors, data.workshops]);

  const rows = useMemo<SlotRow[]>(
    () =>
      data.sessions.map((session) => ({
        ...session,
        entityLabel:
          entityLabelByKey.get(`${session.entityType}:${session.recordId}`) ??
          "Unknown",
      })),
    [data.sessions, entityLabelByKey]
  );

  const stats = useMemo(() => {
    let free = 0;
    let busy = 0;
    let instructorSlots = 0;
    let workshopSlots = 0;

    for (const row of rows) {
      if (row.type === "free") {
        free += 1;
      } else {
        busy += 1;
      }
      if (row.entityType === ENTITY_SCHEDULE_TYPE_INSTRUCTOR) {
        instructorSlots += 1;
      } else {
        workshopSlots += 1;
      }
    }

    return {
      total: rows.length,
      free,
      busy,
      instructorSlots,
      workshopSlots,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesEntity =
        entityTypeFilter === FILTER_ALL || row.entityType === entityTypeFilter;
      const matchesType =
        slotTypeFilter === FILTER_ALL || row.type === slotTypeFilter;
      return matchesEntity && matchesType && matchesSearch(row, searchQuery);
    });
  }, [rows, entityTypeFilter, slotTypeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredRows.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredRows.length);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  function handleEntityTypeFilterChange(value: string | null) {
    setEntityTypeFilter(value ?? FILTER_ALL);
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Schedule slot details
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse all weekly free and busy slots for instructors and workshops.
          </p>
        </div>
        <Link
          href={ROUTES.MANAGER_INSTRUCTOR_SCHEDULES}
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          <CalendarDaysIcon data-icon="inline-start" />
          Open calendar
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          label="Instructor / workshop"
          value={`${stats.instructorSlots} / ${stats.workshopSlots}`}
          accentClassName="border-l-violet-500"
        />
      </div>

      <Card className="py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Schedule slots</CardTitle>
          <CardAction className="self-center text-sm text-muted-foreground">
            {filteredRows.length} match
            {filteredRows.length === 1 ? "" : "es"}
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search name, entity, type, or weekday…"
                className="pl-8"
                aria-label="Search schedule slots"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={entityTypeFilter}
                onValueChange={handleEntityTypeFilterChange}
              >
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Filter by entity type"
                >
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={FILTER_ALL}>All entities</SelectItem>
                  {ENTITY_SCHEDULE_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ENTITY_SCHEDULE_TYPE_LABELS[value as ScheduleEntityType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={slotTypeFilter}
                onValueChange={handleSlotTypeFilterChange}
              >
                <SelectTrigger
                  className="w-full sm:w-40"
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Entity type</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Weekday</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Color</th>
                  <th className="px-4 py-3 font-medium">Anchor date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No schedule slots match your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
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
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {ENTITY_SCHEDULE_TYPE_LABELS[row.entityType]}
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {rangeStart}–{rangeEnd} of {filteredRows.length}
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
  );
}
