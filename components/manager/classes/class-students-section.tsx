"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  ArrowRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { removeStudentFromClassAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { AddStudentToClassDialog } from "@/components/manager/classes/add-student-to-class-dialog";
import { CopyStudentsFromClassDialog } from "@/components/manager/classes/copy-students-from-class-dialog";
import {
  TransferStudentBetweenClassesDialog,
  type ClassTransferOption,
} from "@/components/manager/classes/transfer-student-between-classes-dialog";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import { CLASS_STUDENT_TABLE_LIMITS } from "@/lib/constants/manager-class-student-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerStudentDetailRoute } from "@/lib/constants/routes";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { RemoveStudentFromClassActionState } from "@/types/manager-class-detail";

const PAGE_SIZE = 10;
const initialRemoveState: RemoveStudentFromClassActionState = {};

type ClassStudentsSectionProps = {
  classId: string;
  className: string;
  semesterId: string | null;
  initialStudents: ManagerClassStudentRow[];
  availableStudents: ManagerStudentRow[];
  transferClassOptions: ClassTransferOption[];
  onStudentsChange: (students: ManagerClassStudentRow[]) => void;
  onAvailableStudentsChange: (students: ManagerStudentRow[]) => void;
  onClassUpdated: (classRow: ManagerClassRow) => void;
  onStudentGradeAdded: (grade: ManagerStudentFinalExamGradeRow) => void;
};

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

function matchesSearch(student: ManagerClassStudentRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    student.full_name,
    student.username ?? "",
    student.email,
    student.phone ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function ClassStudentsSection({
  classId,
  className,
  semesterId,
  initialStudents,
  availableStudents,
  transferClassOptions,
  onStudentsChange,
  onAvailableStudentsChange,
  onClassUpdated,
  onStudentGradeAdded,
}: ClassStudentsSectionProps) {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  const [removeState, removeAction, isRemovePending] = useActionState(
    removeStudentFromClassAction,
    initialRemoveState
  );
  const isPending = isRemovePending || isTransitionPending;

  useActionStateToast(removeState, isPending);

  const [students, setStudents] = useState(initialStudents);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [transferringStudent, setTransferringStudent] =
    useState<ManagerClassStudentRow | null>(null);
  const [removingStudent, setRemovingStudent] =
    useState<ManagerClassStudentRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const handleRemoveOpenChange = usePendingAwareOpenChange(
    isPending,
    (open) => {
      if (!open) {
        setRemovingStudent(null);
      }
    }
  );

  useActionStateSuccess(
    removeState,
    isPending,
    (nextState) => {
      if (!nextState.removedStudentId) {
        return;
      }

      const removedId = nextState.removedStudentId;
      const nextStudents = students.filter((row) => row.id !== removedId);
      setStudents(nextStudents);
      onStudentsChange(nextStudents);
      setRemovingStudent(null);
      router.refresh();
    },
    (nextState) => Boolean(nextState.success && nextState.removedStudentId)
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student) => matchesSearch(student, searchQuery));
  }, [students, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedStudents = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredStudents, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredStudents.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * PAGE_SIZE,
    filteredStudents.length
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  function handleConfirmRemove() {
    if (!removingStudent) {
      return;
    }

    const formData = new FormData();
    formData.set("id", removingStudent.id);
    formData.set("class_id", classId);

    startTransition(() => {
      removeAction(formData);
    });
  }

  const handleStudentsAdded = (
    addedStudents: ManagerClassStudentRow[],
    classRow: ManagerClassRow,
    studentGrades: ManagerStudentFinalExamGradeRow[] = []
  ) => {
    const existingIds = new Set(students.map((row) => row.id));
    const fresh = addedStudents.filter((row) => !existingIds.has(row.id));
    if (fresh.length === 0) {
      return;
    }

    const nextStudents = [...fresh, ...students];
    setStudents(nextStudents);
    onStudentsChange(nextStudents);

    const addedProfileIds = new Set(
      fresh.map((row) => row.student_profile_id)
    );
    onAvailableStudentsChange(
      availableStudents.filter(
        (row) => !addedProfileIds.has(row.student_profile_id)
      )
    );
    onClassUpdated(classRow);
    for (const grade of studentGrades) {
      onStudentGradeAdded(grade);
    }
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
      {isAddOpen ? (
        <AddStudentToClassDialog
          open
          onOpenChange={setIsAddOpen}
          classId={classId}
          className={className}
          availableStudents={availableStudents}
          onStudentsAdded={handleStudentsAdded}
        />
      ) : null}

      {isCopyOpen ? (
        <CopyStudentsFromClassDialog
          open
          onOpenChange={setIsCopyOpen}
          classId={classId}
          className={className}
          onStudentsAdded={handleStudentsAdded}
        />
      ) : null}

      <TransferStudentBetweenClassesDialog
        open={transferringStudent !== null}
        onOpenChange={(open) => {
          if (!open) setTransferringStudent(null);
        }}
        fromClassId={classId}
        student={transferringStudent}
        classOptions={transferClassOptions}
        onTransferred={() => {
          setTransferringStudent(null);
          router.refresh();
        }}
      />

      <Dialog
        open={removingStudent !== null}
        onOpenChange={handleRemoveOpenChange}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>Remove student</DialogTitle>
            <DialogDescription>
              Remove {removingStudent?.full_name ?? "this student"} from{" "}
              {className}? They will leave the class roster. Billing and payment
              phase records are kept if any exist.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleRemoveOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <InlineSpinner />
                  Removing
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClassTabCollapsibleSection
        title="Students"
        description={`Students in ${className}.`}
        storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.CLASS_DETAILS_STUDENTS}
        defaultOpen
        action={
          <div className="flex flex-wrap items-center gap-2">
            {semesterId ? (
              <Can permission={PERMISSIONS.CLASSES_COPY_STUDENTS_FROM_CLASS}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCopyOpen(true)}
                >
                  <CopyIcon data-icon="inline-start" />
                  Copy from class
                </Button>
              </Can>
            ) : null}
            <Can permission={PERMISSIONS.CLASSES_ADD_STUDENT}>
              <Button type="button" onClick={() => setIsAddOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Add student
              </Button>
            </Can>
          </div>
        }
      >
          <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search name, username, email, or phone…"
                className="pl-8"
                aria-label="Search class students"
              />
            </div>
          </div>

          {paginatedStudents.length === 0 ? (
            <div className="px-4 py-3">
              <EmptyState
                size="sm"
                icon={students.length === 0 ? UsersIcon : SearchIcon}
                title={
                  students.length === 0
                    ? "No students yet"
                    : "No matching students"
                }
                description={
                  students.length === 0
                    ? "No students in this class yet."
                    : "No students match your search."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Full name</th>
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="max-w-[12rem] px-4 py-3">
                        <TruncatedCell
                          value={student.full_name}
                          maxLength={CLASS_STUDENT_TABLE_LIMITS.fullName}
                        />
                      </td>
                      <td className="max-w-[10rem] px-4 py-3">
                        <TruncatedCell
                          value={student.username ?? "—"}
                          maxLength={CLASS_STUDENT_TABLE_LIMITS.username}
                        />
                      </td>
                      <td className="max-w-[14rem] px-4 py-3">
                        <TruncatedCell
                          value={student.email}
                          maxLength={CLASS_STUDENT_TABLE_LIMITS.email}
                        />
                      </td>
                      <td className="max-w-[9rem] px-4 py-3">
                        <TruncatedCell
                          value={student.phone ?? "—"}
                          maxLength={CLASS_STUDENT_TABLE_LIMITS.phone}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {student.joined_at
                          ? format(new Date(student.joined_at), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Can permission={PERMISSIONS.CLASSES_REMOVE_STUDENT}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Remove ${student.full_name}`}
                              onClick={() => setRemovingStudent(student)}
                            >
                              <Trash2Icon />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Transfer ${student.full_name}`}
                              onClick={() => setTransferringStudent(student)}
                            >
                              <ArrowRightLeftIcon />
                            </Button>
                          </Can>
                          <Link
                            href={getManagerStudentDetailRoute(
                              student.student_profile_id
                            )}
                            aria-label={`View ${student.full_name}`}
                            className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <EyeIcon className="size-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredStudents.length > 0 ? (
            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {filteredStudents.length}
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
          ) : null}
      </ClassTabCollapsibleSection>
    </TooltipProvider>
  );
}
