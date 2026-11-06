"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SearchIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddPhaseDialog } from "@/components/manager/phases/add-phase-dialog";
import { EditPhaseDialog } from "@/components/manager/phases/edit-phase-dialog";
import { PhaseCard } from "@/components/manager/phases/phase-card";
import { MANAGER_CARD_GRID_CLASS_NAME } from "@/components/manager/shared/grid-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { prependUniqueById } from "@/lib/utils/prepend-unique-by-id";
import type { ManagerSemesterRow } from "@/types/manager-phase";

const PAGE_SIZE = 12;

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

  const haystack = [phase.name, phase.semester_code].join(" ").toLowerCase();

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
  const [phases, setPhases] = useState(initialSemesters);
  const [prevPhases, setPrevPhases] = useState(initialSemesters);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSemester, setEditingSemester] =
    useState<ManagerSemesterRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortByValue>(SORT_BY_NAME);
  const [sortOrder, setSortOrder] = useState<SortOrderValue>(SORT_ORDER_ASC);
  const [currentPage, setCurrentPage] = useState(1);

  if (initialSemesters !== prevPhases) {
    setPrevPhases(initialSemesters);
    setPhases(initialSemesters);
  }

  const filteredPhases = useMemo(() => {
    const matched = phases.filter((phase) => matchesSearch(phase, searchQuery));
    return [...matched].sort((left, right) =>
      compareSemesters(left, right, sortBy, sortOrder)
    );
  }, [phases, searchQuery, sortBy, sortOrder]);

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

  const handleSemesterCreated = (semester: ManagerSemesterRow) => {
    setPhases((current) => prependUniqueById(current, semester));
    setCurrentPage(1);
  };

  const handleSemesterUpdated = (semester: ManagerSemesterRow) => {
    setPhases((current) =>
      current.map((row) => (row.id === semester.id ? semester : row))
    );
    setEditingSemester(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title="Manage semesters" />
      <div className="flex flex-wrap items-center justify-end gap-2 empty:hidden">
        <Can permission={PERMISSIONS.SEMESTERS_CREATE}>
          <Button type="button" onClick={() => setIsAddOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add semester
          </Button>
        </Can>
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

      <div className="flex flex-col gap-3 @2xl/panel:flex-row @2xl/panel:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search semester name or code..."
            className="pl-8"
            aria-label="Search semesters"
          />
        </div>
        <div className="flex flex-col gap-3 @lg/panel:flex-row">
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
              className="w-full @lg/panel:w-44"
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
              className="w-full @lg/panel:w-40"
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
        <div className={MANAGER_CARD_GRID_CLASS_NAME}>
          {paginatedPhases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              onEdit={setEditingSemester}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t pt-4 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
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
    </div>
  );
}
