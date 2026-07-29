"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddSubjectDialog } from "@/components/manager/subjects/add-subject-dialog";
import { SubjectCard } from "@/components/manager/subjects/subject-card";
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
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { ManagerSubjectRow } from "@/types/manager-subject";

const PAGE_SIZE = 15;

const CLASS_SORT_MOST = "most";
const CLASS_SORT_LEAST = "least";

const CLASS_SORT_LABELS = {
  [CLASS_SORT_MOST]: "Most classes first",
  [CLASS_SORT_LEAST]: "Least classes first",
} as const;

type ClassSortValue = keyof typeof CLASS_SORT_LABELS;

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

function matchesSearch(subject: ManagerSubjectRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    subject.name,
    subject.syllabus_link ?? "",
    subject.reference_link ?? "",
    subject.handout_link ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function compareByClassCount(
  left: ManagerSubjectRow,
  right: ManagerSubjectRow,
  sort: ClassSortValue
) {
  const classDiff =
    sort === CLASS_SORT_MOST
      ? right.class_count - left.class_count
      : left.class_count - right.class_count;

  if (classDiff !== 0) {
    return classDiff;
  }

  return left.name.localeCompare(right.name);
}

type SubjectsPaginationProps = {
  position: "top" | "bottom";
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  safeCurrentPage: number;
  totalPages: number;
  pageNumbers: Array<number | "ellipsis">;
  onPageChange: (page: number) => void;
};

function SubjectsPagination({
  position,
  rangeStart,
  rangeEnd,
  totalCount,
  safeCurrentPage,
  totalPages,
  pageNumbers,
  onPageChange,
}: SubjectsPaginationProps) {
  const rangeLabel = (
    <p className="text-sm text-muted-foreground">
      Showing {rangeStart}–{rangeEnd} of {totalCount}
    </p>
  );

  const pageControls = (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={safeCurrentPage <= 1}
        onClick={() => onPageChange(safeCurrentPage - 1)}
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
            onClick={() => onPageChange(page)}
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
        onClick={() => onPageChange(safeCurrentPage + 1)}
        aria-label="Next page"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );

  if (position === "top") {
    return (
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="min-w-0 justify-self-start">{rangeLabel}</div>
        <div className="justify-self-center">{pageControls}</div>
        <div aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 border-t pt-4">
      {rangeLabel}
      {pageControls}
    </div>
  );
}

type ManageSubjectsPanelProps = {
  initialSubjects: ManagerSubjectRow[];
};

export function ManageSubjectsPanel({
  initialSubjects,
}: ManageSubjectsPanelProps) {
  const router = useRouter();
  const subjects = initialSubjects;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [classSort, setClassSort] = useState<ClassSortValue>(CLASS_SORT_MOST);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredSubjects = useMemo(() => {
    return subjects
      .filter((subject) => matchesSearch(subject, searchQuery))
      .sort((left, right) => compareByClassCount(left, right, classSort));
  }, [subjects, searchQuery, classSort]);

  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedSubjects = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredSubjects.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredSubjects, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredSubjects.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safeCurrentPage * PAGE_SIZE, filteredSubjects.length);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleClassSortChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setClassSort(value as ClassSortValue);
    setCurrentPage(1);
  };

  const handleSubjectCreated = () => {
    setCurrentPage(1);
    router.refresh();
  };

  const paginationProps = {
    rangeStart,
    rangeEnd,
    totalCount: filteredSubjects.length,
    safeCurrentPage,
    totalPages,
    pageNumbers,
    onPageChange: setCurrentPage,
  } satisfies Omit<SubjectsPaginationProps, "position">;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manage subjects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Subjects and linked class counts from your school catalog.
          </p>
        </div>
        <Can permission={PERMISSIONS.SUBJECTS_CREATE}>
          <Button type="button" onClick={() => setIsAddOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add subject
          </Button>
        </Can>
      </div>

      <AddSubjectDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubjectCreated={handleSubjectCreated}
      />

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle>Subjects</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-4 pt-2 pb-3">
          <SubjectsPagination position="top" {...paginationProps} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search subject name or links…"
                className="pl-8"
                aria-label="Search subjects"
              />
            </div>
            <Select value={classSort} onValueChange={handleClassSortChange}>
              <SelectTrigger
                className="w-full sm:w-52"
                aria-label="Sort by class count"
              >
                <SelectValue placeholder="Sort by classes">
                  {(value) =>
                    CLASS_SORT_LABELS[value as ClassSortValue] ??
                    "Sort by classes"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={CLASS_SORT_MOST}>
                  {CLASS_SORT_LABELS[CLASS_SORT_MOST]}
                </SelectItem>
                <SelectItem value={CLASS_SORT_LEAST}>
                  {CLASS_SORT_LABELS[CLASS_SORT_LEAST]}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paginatedSubjects.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No subjects match your search.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedSubjects.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          )}

          <SubjectsPagination position="bottom" {...paginationProps} />
        </CardContent>
      </Card>
    </div>
  );
}
