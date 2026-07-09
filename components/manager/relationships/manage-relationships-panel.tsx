"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { AddRelationshipDialog } from "@/components/manager/relationships/add-relationship-dialog";
import { RelationshipDetailSheet } from "@/components/manager/relationships/relationship-detail-sheet";
import { ViewRelationshipDialog } from "@/components/manager/relationships/view-relationship-dialog";
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
const MAJOR_FILTER_ALL = "all";
const SPECIALITY_FILTER_ALL = "all";

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

function getDistinctValues(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))]
    .sort((a, b) => a.localeCompare(b));
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

type ManageRelationshipsPanelProps = {
  initialRelationships: ManagerRelationshipRow[];
};

export function ManageRelationshipsPanel({
  initialRelationships,
}: ManageRelationshipsPanelProps) {
  const router = useRouter();
  const relationships = initialRelationships;
  const [searchQuery, setSearchQuery] = useState("");
  const [usefulFilter, setUsefulFilter] = useState<string>(USEFUL_FILTER_ALL);
  const [majorFilter, setMajorFilter] = useState<string>(MAJOR_FILTER_ALL);
  const [specialityFilter, setSpecialityFilter] = useState<string>(
    SPECIALITY_FILTER_ALL
  );
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRelationship, setSelectedRelationship] =
    useState<ManagerRelationshipRow | null>(null);
  const [viewingRelationship, setViewingRelationship] =
    useState<ManagerRelationshipRow | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
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

  const majorOptions = useMemo(
    () => getDistinctValues(relationships.map((row) => row.major)),
    [relationships]
  );

  const specialityOptions = useMemo(() => {
    const source =
      majorFilter === MAJOR_FILTER_ALL
        ? relationships
        : relationships.filter((row) => row.major === majorFilter);

    return getDistinctValues(source.map((row) => row.speciality));
  }, [relationships, majorFilter]);

  useEffect(() => {
    if (
      specialityFilter !== SPECIALITY_FILTER_ALL &&
      !specialityOptions.includes(specialityFilter)
    ) {
      setSpecialityFilter(SPECIALITY_FILTER_ALL);
    }
  }, [specialityFilter, specialityOptions]);

  const filteredRelationships = useMemo(() => {
    return relationships.filter((relationship) => {
      const matchesUseful =
        usefulFilter === USEFUL_FILTER_ALL ||
        (usefulFilter === USEFUL_FILTER_USEFUL && relationship.is_useful) ||
        (usefulFilter === USEFUL_FILTER_NOT_USEFUL && !relationship.is_useful);

      const matchesMajor =
        majorFilter === MAJOR_FILTER_ALL || relationship.major === majorFilter;

      const matchesSpeciality =
        specialityFilter === SPECIALITY_FILTER_ALL ||
        relationship.speciality === specialityFilter;

      return (
        matchesUseful &&
        matchesMajor &&
        matchesSpeciality &&
        matchesSearch(relationship, searchQuery)
      );
    });
  }, [relationships, searchQuery, usefulFilter, majorFilter, specialityFilter]);

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

  const handleMajorFilterChange = (value: string | null) => {
    setMajorFilter(value ?? MAJOR_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleSpecialityFilterChange = (value: string | null) => {
    setSpecialityFilter(value ?? SPECIALITY_FILTER_ALL);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  const handleOpenViewDialog = (relationship: ManagerRelationshipRow) => {
    setViewingRelationship(relationship);
    setIsViewOpen(true);
  };

  const handleOpenEditSheet = (relationship: ManagerRelationshipRow) => {
    setSelectedRelationship(relationship);
    setIsSheetOpen(true);
  };

  const handleRelationshipCreated = () => {
    setCurrentPage(1);
    router.refresh();
  };

  const handleRelationshipUpdated = () => {
    router.refresh();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manage relationships
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Student relationship contacts — add, edit, and filter by major or
            speciality.
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
          onRelationshipCreated={handleRelationshipCreated}
        />

        <ViewRelationshipDialog
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
          relationship={viewingRelationship}
        />

        <RelationshipDetailSheet
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          relationship={selectedRelationship}
          onRelationshipUpdated={handleRelationshipUpdated}
        />

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Relationships</CardTitle>
            <CardAction className="self-center">
              <Button type="button" onClick={() => setIsAddOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Add relation
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 lg:flex-row lg:flex-wrap lg:items-center">
              <div className="relative min-w-0 flex-1 lg:min-w-[12rem]">
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
              <Select value={majorFilter} onValueChange={handleMajorFilterChange}>
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Filter by major"
                >
                  <SelectValue placeholder="All majors" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={MAJOR_FILTER_ALL}>All majors</SelectItem>
                  {majorOptions.map((major) => (
                    <SelectItem key={major} value={major}>
                      {major}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={specialityFilter}
                onValueChange={handleSpecialityFilterChange}
              >
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Filter by speciality"
                >
                  <SelectValue placeholder="All specialities" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={SPECIALITY_FILTER_ALL}>
                    All specialities
                  </SelectItem>
                  {specialityOptions.map((speciality) => (
                    <SelectItem key={speciality} value={speciality}>
                      {speciality}
                    </SelectItem>
                  ))}
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
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`View ${relationship.name}`}
                              onClick={() => handleOpenViewDialog(relationship)}
                            >
                              <MessageSquareIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit ${relationship.name}`}
                              onClick={() => handleOpenEditSheet(relationship)}
                            >
                              <PencilIcon />
                            </Button>
                          </div>
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
