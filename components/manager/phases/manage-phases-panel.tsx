"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChartNoAxesColumnIncreasingIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { AddPhaseDialog } from "@/components/manager/phases/add-phase-dialog";
import { EditPhaseDialog } from "@/components/manager/phases/edit-phase-dialog";
import { PhaseCard } from "@/components/manager/phases/phase-card";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/lib/constants/routes";
import { MANAGER_SEMESTER_STATUS_LABELS } from "@/lib/constants/manager-phase-display";
import {
  SEMESTER_STATUS_VALUES,
  type SemesterStatusValue,
} from "@/lib/constants/manager-semester-status";
import type { ManagerSemesterRow } from "@/types/manager-phase";

const PAGE_SIZE = 6;

const STATUS_FILTER_ALL = "all";
const SORT_BY_NAME = "name";
const SORT_BY_CREATED = "created_at";
const SORT_ORDER_ASC = "asc";
const SORT_ORDER_DESC = "desc";

const SORT_BY_LABELS = {
  [SORT_BY_NAME]: "Name",
  [SORT_BY_CREATED]: "Database order",
} as const;

const SORT_ORDER_LABELS = {
  [SORT_ORDER_ASC]: "Ascending",
  [SORT_ORDER_DESC]: "Descending",
} as const;

type SortByValue = keyof typeof SORT_BY_LABELS;
type SortOrderValue = keyof typeof SORT_ORDER_LABELS;

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

function matchesSearch(phase: ManagerSemesterRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    phase.name,
    String(phase.amount),
    String(phase.nb_courses),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function compareSemesters(
  left: ManagerSemesterRow,
  right: ManagerSemesterRow,
  sortBy: SortByValue,
  sortOrder: SortOrderValue
) {
  const direction = sortOrder === SORT_ORDER_ASC ? 1 : -1;

  if (sortBy === SORT_BY_NAME) {
    const byName = left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
      numeric: true,
    });
    if (byName !== 0) {
      return byName * direction;
    }
  } else {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();
    const byCreated = leftTime - rightTime;
    if (byCreated !== 0) {
      return byCreated * direction;
    }
  }

  return left.id.localeCompare(right.id) * direction;
}

type ManagePhasesPanelProps = {
  initialSemesters: ManagerSemesterRow[];
};

export function ManagePhasesPanel({ initialSemesters }: ManagePhasesPanelProps) {
  const router = useRouter();
  const phases = initialSemesters;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSemester, setEditingSemester] =
    useState<ManagerSemesterRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [sortBy, setSortBy] = useState<SortByValue>(SORT_BY_NAME);
  const [sortOrder, setSortOrder] = useState<SortOrderValue>(SORT_ORDER_ASC);
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(
    () => ({
      total: phases.length,
      totalCourses: phases.reduce((sum, phase) => sum + phase.nb_courses, 0),
      highestAmount:
        phases.length === 0
          ? 0
          : Math.max(...phases.map((phase) => phase.amount)),
      averageAmount:
        phases.length === 0
          ? 0
          : Math.round(
              (phases.reduce((sum, phase) => sum + phase.amount, 0) / phases.length) *
                100
            ) / 100,
    }),
    [phases]
  );

  const filteredPhases = useMemo(() => {
    const matched = phases.filter((phase) => {
      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL || phase.status === statusFilter;
      return matchesStatus && matchesSearch(phase, searchQuery);
    });
    return [...matched].sort((left, right) =>
      compareSemesters(left, right, sortBy, sortOrder)
    );
  }, [phases, searchQuery, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredPhases.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPhases = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredPhases.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPhases, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredPhases.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safeCurrentPage * PAGE_SIZE, filteredPhases.length);

  const handleSemesterCreated = () => {
    setCurrentPage(1);
    router.refresh();
  };

  const handleSemesterUpdated = () => {
    setEditingSemester(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage semesters</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semesters with course counts and billing amounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            render={<Link href={ROUTES.MANAGER_SEMESTERS_PROGRESS} />}
            nativeButton={false}
            variant="outline"
          >
            <ChartNoAxesColumnIncreasingIcon data-icon="inline-start" />
            Progress track
          </Button>
          <Button type="button" onClick={() => setIsAddOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add semester
          </Button>
        </div>
      </div>

      <AddPhaseDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSemesterCreated={handleSemesterCreated}
      />

      {editingSemester ? (
        <EditPhaseDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditingSemester(null);
            }
          }}
          semester={editingSemester}
          onSemesterUpdated={handleSemesterUpdated}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UserStatCard
          label="Total semesters"
          value={stats.total}
          accentClassName="border-l-sky-500"
        />
        <UserStatCard
          label="Total courses"
          value={stats.totalCourses}
          accentClassName="border-l-emerald-500"
        />
        <UserStatCard
          label="Highest amount"
          value={stats.highestAmount}
          accentClassName="border-l-violet-500"
        />
        <UserStatCard
          label="Average amount"
          value={stats.averageAmount}
          accentClassName="border-l-amber-500"
        />
      </div>

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle>Semesters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-4 pt-2 pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search semester name, amount, or number of courses..."
                className="pl-8"
                aria-label="Search semesters"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-40"
                  aria-label="Filter by status"
                >
                  <SelectValue placeholder="Status">
                    {(value) =>
                      !value || value === STATUS_FILTER_ALL
                        ? "Status"
                        : (MANAGER_SEMESTER_STATUS_LABELS[
                            value as SemesterStatusValue
                          ] ?? String(value))
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={STATUS_FILTER_ALL}>Status</SelectItem>
                  {SEMESTER_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {MANAGER_SEMESTER_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }
                  setSortBy(value as SortByValue);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Sort semesters by"
                >
                  <SelectValue placeholder="Sort by">
                    {(value) =>
                      SORT_BY_LABELS[value as SortByValue] ?? "Sort by"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={SORT_BY_NAME}>Name</SelectItem>
                  <SelectItem value={SORT_BY_CREATED}>Database order</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortOrder}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }
                  setSortOrder(value as SortOrderValue);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-40"
                  aria-label="Sort order"
                >
                  <SelectValue placeholder="Order">
                    {(value) =>
                      SORT_ORDER_LABELS[value as SortOrderValue] ?? "Order"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={SORT_ORDER_ASC}>Ascending</SelectItem>
                  <SelectItem value={SORT_ORDER_DESC}>Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {paginatedPhases.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No semesters match your search.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedPhases.map((phase) => (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  onEdit={setEditingSemester}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {filteredPhases.length}
            </p>

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
  );
}
