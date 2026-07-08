"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { AddRelationshipDialog } from "@/components/manager/relationships/add-relationship-dialog";
import { RelationshipDetailSheet } from "@/components/manager/relationships/relationship-detail-sheet";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MANAGER_RELATIONSHIPS_MOCK } from "@/lib/constants/manager-relationships-mock";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerRelationshipRow } from "@/types/manager-relationship";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const COLUMN_LIMITS = {
  name: 24,
  relation: 16,
  phone: 18,
} as const;

const USEFUL_FILTER_ALL = "all";
const USEFUL_FILTER_USEFUL = "useful";
const USEFUL_FILTER_NOT_USEFUL = "not_useful";

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

function matchesSearch(relationship: ManagerRelationshipRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    relationship.name,
    relationship.relation_with ?? "",
    relationship.phone ?? "",
    relationship.major ?? "",
    relationship.speciality ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function UsefulBadge({ isUseful }: { isUseful: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        isUseful
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-muted text-muted-foreground"
      )}
    >
      {isUseful ? "Useful" : "Not useful"}
    </span>
  );
}

export function ManageRelationshipsPanel() {
  const [relationships, setRelationships] = useState(MANAGER_RELATIONSHIPS_MOCK);
  const [searchQuery, setSearchQuery] = useState("");
  const [usefulFilter, setUsefulFilter] = useState<string>(USEFUL_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRelationship, setSelectedRelationship] =
    useState<ManagerRelationshipRow | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const stats = useMemo(() => {
    return {
      total: relationships.length,
      useful: relationships.filter((row) => row.is_useful).length,
      notUseful: relationships.filter((row) => !row.is_useful).length,
      withPhone: relationships.filter((row) => Boolean(row.phone?.trim())).length,
    };
  }, [relationships]);

  const filteredRelationships = useMemo(() => {
    return relationships.filter((relationship) => {
      const matchesUseful =
        usefulFilter === USEFUL_FILTER_ALL ||
        (usefulFilter === USEFUL_FILTER_USEFUL && relationship.is_useful) ||
        (usefulFilter === USEFUL_FILTER_NOT_USEFUL && !relationship.is_useful);

      return matchesUseful && matchesSearch(relationship, searchQuery);
    });
  }, [relationships, searchQuery, usefulFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRelationships.length / pageSize)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRelationships = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredRelationships.slice(startIndex, startIndex + pageSize);
  }, [filteredRelationships, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredRelationships.length === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * pageSize,
    filteredRelationships.length
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleUsefulFilterChange = (value: string | null) => {
    setUsefulFilter(value ?? USEFUL_FILTER_ALL);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  const handleOpenSheet = (relationship: ManagerRelationshipRow) => {
    setSelectedRelationship(relationship);
    setIsSheetOpen(true);
  };

  const handleUpdateRelationship = (updated: ManagerRelationshipRow) => {
    setRelationships((current) =>
      current.map((row) => (row.id === updated.id ? updated : row))
    );
    setSelectedRelationship(updated);
  };

  const handleCreateRelationship = (relationship: ManagerRelationshipRow) => {
    setRelationships((current) => [relationship, ...current]);
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manage relationships
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview of student relationship contacts. Data is mocked until
            backend is connected.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UserStatCard
            label="Total relationships"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Useful contacts"
            value={stats.useful}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Not useful"
            value={stats.notUseful}
            accentClassName="border-l-amber-500"
          />
          <UserStatCard
            label="With phone"
            value={stats.withPhone}
            accentClassName="border-l-violet-500"
          />
        </div>

        <AddRelationshipDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onCreateRelationship={handleCreateRelationship}
        />

        <RelationshipDetailSheet
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          relationship={selectedRelationship}
          onUpdateRelationship={handleUpdateRelationship}
        />

        <Card className="py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Relationships</CardTitle>
            <CardAction className="self-center">
              <Button type="button" onClick={() => setIsAddOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Add relation
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name, relation, phone, or major…"
                  className="pl-8"
                  aria-label="Search relationships"
                />
              </div>
              <Select
                value={usefulFilter}
                onValueChange={handleUsefulFilterChange}
              >
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Filter by usefulness"
                >
                  <SelectValue placeholder="All contacts" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={USEFUL_FILTER_ALL}>All contacts</SelectItem>
                  <SelectItem value={USEFUL_FILTER_USEFUL}>Useful only</SelectItem>
                  <SelectItem value={USEFUL_FILTER_NOT_USEFUL}>
                    Not useful only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Relation</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Useful</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRelationships.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No relationships match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRelationships.map((relationship) => (
                      <tr
                        key={relationship.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[11rem] px-4 py-3">
                          <TruncatedCell
                            value={relationship.name}
                            maxLength={COLUMN_LIMITS.name}
                          />
                        </td>
                        <td className="max-w-[8rem] px-4 py-3">
                          <TruncatedCell
                            value={relationship.relation_with ?? "—"}
                            maxLength={COLUMN_LIMITS.relation}
                          />
                        </td>
                        <td className="max-w-[9rem] px-4 py-3">
                          <TruncatedCell
                            value={relationship.phone ?? "—"}
                            maxLength={COLUMN_LIMITS.phone}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <UsefulBadge isUseful={relationship.is_useful} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`View ${relationship.name}`}
                            onClick={() => handleOpenSheet(relationship)}
                          >
                            <MessageSquareIcon />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {filteredRelationships.length}
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
