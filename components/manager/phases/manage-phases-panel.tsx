"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { AddPhaseDialog } from "@/components/manager/phases/add-phase-dialog";
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
import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import type { ManagerSemesterRow } from "@/types/manager-phase";

const PAGE_SIZE_OPTIONS = [4, 8, 12] as const;

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

export function ManagePhasesPanel() {
  const [phases, setPhases] = useState(MANAGER_PHASES_MOCK);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(4);
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(
    () => ({
      total: phases.length,
      totalCourses: phases.reduce((sum, phase) => sum + phase.nb_courses, 0),
      highestAmount: Math.max(...phases.map((phase) => phase.amount)),
      averageAmount:
        phases.length === 0
          ? 0
          : Math.round(
              (phases.reduce((sum, phase) => sum + phase.amount, 0) / phases.length) * 100
            ) / 100,
    }),
    [phases]
  );

  const filteredPhases = useMemo(() => {
    return phases.filter((phase) => matchesSearch(phase, searchQuery));
  }, [phases, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPhases.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPhases = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredPhases.slice(startIndex, startIndex + pageSize);
  }, [filteredPhases, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredPhases.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredPhases.length);

  const handleCreatePhase = (phase: ManagerSemesterRow) => {
    setPhases((current) => [phase, ...current]);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage semesters</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview semesters in compact cards with simple filters and pagination.
          </p>
        </div>
        <Button type="button" onClick={() => setIsAddOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Add semester
        </Button>
      </div>

      <AddPhaseDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onCreatePhase={handleCreatePhase}
      />

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
        <CardHeader className="border-b bg-muted/50 py-4">
          <CardTitle>Semesters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-4 py-4">
          <div className="relative max-w-md">
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

          {paginatedPhases.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No semesters match your search.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedPhases.map((phase) => (
                <PhaseCard key={phase.id} phase={phase} />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {rangeStart}–{rangeEnd} of {filteredPhases.length}
              </span>
              <span aria-hidden="true">·</span>
              <div className="flex items-center gap-2">
                <span>Cards</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }

                    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-16"
                    aria-label="Cards per page"
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
  );
}
