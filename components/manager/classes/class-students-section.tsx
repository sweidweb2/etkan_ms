"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { format } from "date-fns";
import {
  ArrowRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import {
  loadClassStudentsPageAction,
  removeStudentFromClassAction,
  setStudentTeamLeaderAction,
} from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { TeamLeaderToggle } from "@/components/classes/team-leader-toggle";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { AddStudentToClassDialog } from "@/components/manager/classes/add-student-to-class-dialog";
import { CancelSemesterDropDialog } from "@/components/manager/classes/cancel-semester-drop-dialog";
import { CopyStudentsFromClassDialog } from "@/components/manager/classes/copy-students-from-class-dialog";
import { DropSemesterDialog } from "@/components/manager/classes/drop-semester-dialog";
import {
  TransferStudentBetweenClassesDialog,
  type ClassTransferOption,
} from "@/components/manager/classes/transfer-student-between-classes-dialog";
import { SEMESTER_DROP_BADGE_LABELS } from "@/lib/constants/manager-semester-drop-display";
import {
  canRemoveClassStudent,
  classStudentRemoveBlockedReason,
  hasLinkedStudentProfile,
} from "@/lib/manager/class-student-row-access";
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
import {
  CLASS_STUDENTS_PAGE_SIZE,
  CLASS_STUDENT_TABLE_LIMITS,
} from "@/lib/constants/manager-class-student-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerStudentDetailRoute } from "@/lib/constants/routes";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { RemoveStudentFromClassActionState } from "@/types/manager-class-detail";

const PAGE_SIZE = CLASS_STUDENTS_PAGE_SIZE;
const initialRemoveState: RemoveStudentFromClassActionState = {};

type ClassStudentsSectionProps = {
  classId: string;
  className: string;
  semesterId: string | null;
  initialStudents: ManagerClassStudentRow[];
  initialTotalCount?: number;
  availableStudents: ManagerStudentRow[];
  transferClassOptions: ClassTransferOption[];
  onStudentsChange: (students: ManagerClassStudentRow[]) => void;
  onAvailableStudentsChange: (students: ManagerStudentRow[]) => void;
  onClassUpdated: (classRow: ManagerClassRow) => void;
  onStudentGradeAdded: (grade: ManagerStudentFinalExamGradeRow) => void;
  /** When false, section stays open with no expand/collapse controls. */
  collapsible?: boolean;
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

export function ClassStudentsSection({
  classId,
  className,
  semesterId,
  initialStudents,
  initialTotalCount,
  availableStudents,
  transferClassOptions,
  onStudentsChange,
  onAvailableStudentsChange,
  onClassUpdated,
  onStudentGradeAdded,
  collapsible = true,
}: ClassStudentsSectionProps) {
  const permissions = usePermissions();
  const canSetTeamLeader = hasPermissionInSet(
    permissions,
    PERMISSIONS.CLASSES_SET_TEAM_LEADER
  );
  const [isTransitionPending, startTransition] = useTransition();
  const [isListPending, startListTransition] = useTransition();
  const [removeState, removeAction, isRemovePending] = useActionState(
    removeStudentFromClassAction,
    initialRemoveState
  );
  const isPending = isRemovePending || isTransitionPending;

  useActionStateToast(removeState, isPending);

  const [students, setStudents] = useState(initialStudents);
  const [totalCount, setTotalCount] = useState(
    initialTotalCount ?? initialStudents.length
  );
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [transferringStudent, setTransferringStudent] =
    useState<ManagerClassStudentRow | null>(null);
  const [removingStudent, setRemovingStudent] =
    useState<ManagerClassStudentRow | null>(null);
  const [droppingStudent, setDroppingStudent] =
    useState<ManagerClassStudentRow | null>(null);
  const [stoppingDropStudent, setStoppingDropStudent] =
    useState<ManagerClassStudentRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const listRequestIdRef = useRef(0);
  const skipInitialListFetchRef = useRef(true);

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
      setTotalCount((count) => Math.max(0, count - 1));
      setRemovingStudent(null);
    },
    (nextState) => Boolean(nextState.success && nextState.removedStudentId)
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (
      skipInitialListFetchRef.current &&
      currentPage === 1 &&
      debouncedSearch.length === 0
    ) {
      skipInitialListFetchRef.current = false;
      return;
    }
    skipInitialListFetchRef.current = false;

    const requestId = ++listRequestIdRef.current;
    startListTransition(async () => {
      const data = await loadClassStudentsPageAction(classId, {
        page: currentPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });
      if (requestId !== listRequestIdRef.current) {
        return;
      }
      if (!data) {
        showErrorToast("Unable to load class students.");
        return;
      }
      setStudents(data.students);
      onStudentsChange(data.students);
      setTotalCount(data.totalCount);
      if (data.page !== currentPage) {
        setCurrentPage(data.page);
      }
    });
  }, [classId, currentPage, debouncedSearch, onStudentsChange]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    totalCount === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safeCurrentPage * PAGE_SIZE, totalCount);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleTeamLeaderChange = (
    studentClassId: string,
    isTeamLeader: boolean
  ) => {
    setStudents((prev) => {
      const nextStudents = prev.map((row) =>
        row.id === studentClassId ? { ...row, is_team_leader: isTeamLeader } : row
      );
      onStudentsChange(nextStudents);
      return nextStudents;
    });
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

    const nextStudents = [...fresh, ...students].slice(0, PAGE_SIZE);
    setStudents(nextStudents);
    onStudentsChange(nextStudents);
    setTotalCount((count) => count + fresh.length);

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
    setSearchQuery("");
    setDebouncedSearch("");
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
          if (transferringStudent) {
            const transferredId = transferringStudent.id;
            setStudents((prev) => {
              const nextStudents = prev.filter((row) => row.id !== transferredId);
              onStudentsChange(nextStudents);
              return nextStudents;
            });
            setTotalCount((count) => Math.max(0, count - 1));
          }
          setTransferringStudent(null);
        }}
      />

      <DropSemesterDialog
        open={droppingStudent !== null}
        onOpenChange={(open) => {
          if (!open) setDroppingStudent(null);
        }}
        classId={classId}
        className={className}
        student={droppingStudent}
        onCompleted={({ membershipId, removedMembershipId, pendingRequestId }) => {
          if (removedMembershipId) {
            setStudents((prev) => {
              const nextStudents = prev.filter(
                (row) => row.id !== removedMembershipId
              );
              onStudentsChange(nextStudents);
              return nextStudents;
            });
          } else if (pendingRequestId) {
            setStudents((prev) => {
              const nextStudents = prev.map((row) =>
                row.id === membershipId
                  ? {
                      ...row,
                      has_pending_drop: true,
                      pending_drop_request_id: pendingRequestId,
                    }
                  : row
              );
              onStudentsChange(nextStudents);
              return nextStudents;
            });
          }
          setDroppingStudent(null);
        }}
      />

      <CancelSemesterDropDialog
        open={stoppingDropStudent !== null}
        onOpenChange={(open) => {
          if (!open) setStoppingDropStudent(null);
        }}
        classId={classId}
        student={stoppingDropStudent}
        onCancelled={(membershipId) => {
          setStudents((prev) => {
            const nextStudents = prev.map((row) =>
              row.id === membershipId
                ? {
                    ...row,
                    has_pending_drop: false,
                    pending_drop_request_id: null,
                  }
                : row
            );
            onStudentsChange(nextStudents);
            return nextStudents;
          });
          setStoppingDropStudent(null);
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
              {className}? They leave this class. If they have no other class in
              this semester and an unpaid SPP exists, that SPP is deleted.
              Students with payments must use Drop semester instead.
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
        collapsible={collapsible}
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
          <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search name, email, or phone…"
                className="pl-8"
                aria-label="Search class students"
              />
            </div>
          </div>

          {students.length === 0 ? (
            <div className="px-4 py-3">
              <EmptyState
                size="sm"
                icon={totalCount === 0 && !debouncedSearch ? UsersIcon : SearchIcon}
                title={
                  totalCount === 0 && !debouncedSearch
                    ? "No students yet"
                    : "No matching students"
                }
                description={
                  totalCount === 0 && !debouncedSearch
                    ? "No students in this class yet."
                    : "No students match your search."
                }
              />
            </div>
          ) : (
            <div
              className={cn(
                "overflow-x-auto",
                isListPending && "opacity-60 transition-opacity"
              )}
            >
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="w-12 px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Full name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    {canSetTeamLeader ? (
                      <th className="px-4 py-3 font-medium">Team leader</th>
                    ) : null}
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr
                      key={student.id}
                      className={
                        student.has_pending_drop
                          ? "border-b last:border-b-0 bg-amber-50/80 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-950/45"
                          : "border-b last:border-b-0 hover:bg-muted/30"
                      }
                    >
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {rangeStart + index}
                      </td>
                      <td className="max-w-[12rem] px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <TruncatedCell
                            value={student.full_name}
                            maxLength={CLASS_STUDENT_TABLE_LIMITS.fullName}
                          />
                          {student.has_pending_drop ? (
                            <span className="inline-flex w-fit items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                              {SEMESTER_DROP_BADGE_LABELS.PENDING}
                            </span>
                          ) : null}
                        </div>
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
                      {canSetTeamLeader ? (
                        <td className="px-4 py-3">
                          <TeamLeaderToggle
                            classId={classId}
                            studentClassId={student.id}
                            studentName={student.full_name}
                            isTeamLeader={Boolean(student.is_team_leader)}
                            action={setStudentTeamLeaderAction}
                            onChange={handleTeamLeaderChange}
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {hasLinkedStudentProfile(student.student_profile_id) ? (
                            <Can permission={PERMISSIONS.CLASSES_DROP_SEMESTER}>
                              {student.has_pending_drop ? (
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Stop drop for ${student.full_name}`}
                                        onClick={() =>
                                          setStoppingDropStudent(student)
                                        }
                                      />
                                    }
                                  >
                                    <XIcon />
                                  </TooltipTrigger>
                                  <TooltipContent>Stop drop</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Drop semester for ${student.full_name}`}
                                        onClick={() =>
                                          setDroppingStudent(student)
                                        }
                                      />
                                    }
                                  >
                                    <LogOutIcon />
                                  </TooltipTrigger>
                                  <TooltipContent>Drop semester</TooltipContent>
                                </Tooltip>
                              )}
                            </Can>
                          ) : null}
                          <Can permission={PERMISSIONS.CLASSES_REMOVE_STUDENT}>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Remove ${student.full_name}`}
                                    disabled={!canRemoveClassStudent(student)}
                                    onClick={() => setRemovingStudent(student)}
                                  />
                                }
                              >
                                <Trash2Icon />
                              </TooltipTrigger>
                              <TooltipContent>
                                {classStudentRemoveBlockedReason(student) ??
                                  "Remove"}
                              </TooltipContent>
                            </Tooltip>
                            {hasLinkedStudentProfile(
                              student.student_profile_id
                            ) ? (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`Transfer ${student.full_name}`}
                                      disabled={Boolean(
                                        student.has_pending_drop
                                      )}
                                      onClick={() =>
                                        setTransferringStudent(student)
                                      }
                                    />
                                  }
                                >
                                  <ArrowRightLeftIcon />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {student.has_pending_drop
                                    ? "Transfer is blocked while a semester drop is pending"
                                    : "Transfer"}
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </Can>
                          {hasLinkedStudentProfile(student.student_profile_id) ? (
                            <Link
                              href={getManagerStudentDetailRoute(
                                student.student_profile_id
                              )}
                              aria-label={`View ${student.full_name}`}
                              className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <EyeIcon className="size-4" />
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalCount > 0 ? (
            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {totalCount}
              </p>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safeCurrentPage <= 1 || isListPending}
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
                      disabled={isListPending}
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
                  disabled={safeCurrentPage >= totalPages || isListPending}
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
