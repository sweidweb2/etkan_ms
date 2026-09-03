"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";
import { SemesterClassCard } from "@/components/manager/phases/semester-class-card";
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
import { getManagerClassDetailRoute } from "@/lib/constants/routes";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";

const PAGE_SIZE = 6;

type SemesterClassesSectionProps = {
  semesterName: string;
  initialClasses: ManagerSemesterClassRow[];
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

export function SemesterClassesSection({
  semesterName,
  initialClasses,
}: SemesterClassesSectionProps) {
  const [classes, setClasses] = useState(initialClasses);
  const [prevClasses, setPrevClasses] = useState(initialClasses);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  if (initialClasses !== prevClasses) {
    setPrevClasses(initialClasses);
    setClasses(initialClasses);
  }

  const filteredClasses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return classes;
    }

    return classes.filter((row) => {
      const haystack = [row.name, row.subject_name, row.status]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [classes, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedClasses = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredClasses.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredClasses, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredClasses.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * PAGE_SIZE,
    filteredClasses.length
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 py-3">
        <CardTitle>Classes</CardTitle>
        <CardDescription>
          Classes linked to {semesterName}. Link or unlink from the class
          create/edit form.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4 pb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <UserStatCard
            label="Linked classes"
            value={classes.length}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Showing"
            value={filteredClasses.length}
            accentClassName="border-l-emerald-500"
          />
        </div>

        <div className="relative min-w-0">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search classes..."
            className="pl-8"
            aria-label="Search linked classes"
          />
        </div>

        {paginatedClasses.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No classes linked to this semester.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedClasses.map((classRow) => (
              <Link
                key={classRow.id}
                href={getManagerClassDetailRoute(classRow.id)}
                className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                aria-label={`View class ${classRow.name}`}
                prefetch={false}
              >
                <SemesterClassCard classRow={classRow} />
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {filteredClasses.length}
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
  );
}
