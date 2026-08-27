"use client";

import {
  useActionState,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { removeInstructorAction } from "@/app/manager/instructors/actions";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { AddInstructorsDialog } from "@/components/manager/instructors/add-instructors-dialog";
import {
  InstructorCapabilitiesMatrix,
  removeInstructorFromCapabilitiesCache,
  removeMentorSubjectFromCapabilitiesCache,
} from "@/components/manager/instructors/instructor-capabilities-matrix";
import { MentorSubjectsSection } from "@/components/manager/instructors/mentor-subjects-section";
import { UserRoleBadge } from "@/components/manager/users/user-role-badge";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type {
  ManagerInstructorRow,
  ManagerInstructorsPageData,
  ManagerMentorSubjectColumn,
  RemoveInstructorActionState,
} from "@/types/manager-instructor";

const PAGE_SIZE_OPTIONS = [4, 5, 10, 25] as const;

const initialRemoveState: RemoveInstructorActionState = {};

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

type ManageInstructorsPanelProps = {
  data: ManagerInstructorsPageData;
};

export function ManageInstructorsPanel({ data }: ManageInstructorsPanelProps) {
  const permissions = usePermissions();
  const queryClient = useQueryClient();
  const [instructors, setInstructors] = useState(data.instructors);
  const [candidateUsers, setCandidateUsers] = useState(data.candidateUsers);
  const [mentorSubjects, setMentorSubjects] = useState(data.mentorSubjects);
  const instructorsKey = data.instructors.map((row) => row.id).join("|");
  const candidatesKey = data.candidateUsers.map((row) => row.id).join("|");
  const mentorSubjectsKey = data.mentorSubjects
    .map((row) => `${row.id}:${row.name}:${row.sort_order}`)
    .join("|");
  const [syncedInstructorsKey, setSyncedInstructorsKey] =
    useState(instructorsKey);
  const [syncedCandidatesKey, setSyncedCandidatesKey] = useState(candidatesKey);
  const [syncedMentorSubjectsKey, setSyncedMentorSubjectsKey] =
    useState(mentorSubjectsKey);

  if (instructorsKey !== syncedInstructorsKey) {
    setSyncedInstructorsKey(instructorsKey);
    setInstructors(data.instructors);
  }

  if (candidatesKey !== syncedCandidatesKey) {
    setSyncedCandidatesKey(candidatesKey);
    setCandidateUsers(data.candidateUsers);
  }

  if (mentorSubjectsKey !== syncedMentorSubjectsKey) {
    setSyncedMentorSubjectsKey(mentorSubjectsKey);
    setMentorSubjects(data.mentorSubjects);
  }

  const canUpdateCapabilities = hasPermissionInSet(
    permissions,
    PERMISSIONS.INSTRUCTORS_CAPABILITIES_UPDATE
  );

  const [removeTarget, setRemoveTarget] = useState<ManagerInstructorRow | null>(
    null
  );
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    4
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isRemoveTransitionPending, startRemoveTransition] = useTransition();
  const [removeState, removeFormAction, isRemoveActionPending] = useActionState(
    removeInstructorAction,
    initialRemoveState
  );
  const isRemovePending = isRemoveActionPending || isRemoveTransitionPending;
  const handleRemoveOpenChange = usePendingAwareOpenChange(
    isRemovePending,
    (open) => {
      if (!open) {
        setRemoveTarget(null);
      }
    }
  );

  useActionStateToast(removeState, isRemovePending);

  useActionStateSuccess(removeState, isRemovePending, (nextState) => {
    if (nextState.userId) {
      setInstructors((current) =>
        current.filter((row) => row.id !== nextState.userId)
      );
      setCandidateUsers((current) => {
        const removed = instructors.find(
          (row) => row.id === nextState.userId
        );
        if (!removed) {
          return current;
        }
        return [
          ...current,
          {
            id: removed.id,
            username: removed.username,
            role: removed.role,
            email: removed.email,
          },
        ];
      });
      removeInstructorFromCapabilitiesCache(queryClient, nextState.userId);
    }
    setRemoveTarget(null);
  });

  const totalPages = Math.max(1, Math.ceil(instructors.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedInstructors = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return instructors.slice(startIndex, startIndex + pageSize);
  }, [instructors, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    instructors.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, instructors.length);

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  function handleConfirmRemove() {
    if (!removeTarget) {
      return;
    }
    const formData = new FormData();
    formData.set("userId", removeTarget.id);
    startRemoveTransition(() => {
      removeFormAction(formData);
    });
  }

  function handleMentorSubjectsChange(next: ManagerMentorSubjectColumn[]) {
    const seen = new Set<string>();
    const unique: ManagerMentorSubjectColumn[] = [];
    for (const row of next) {
      if (seen.has(row.id)) {
        continue;
      }
      seen.add(row.id);
      unique.push(row);
    }
    setMentorSubjects(unique);
  }

  function handleMentorSubjectDeleted(mentorSubjectId: string) {
    removeMentorSubjectFromCapabilitiesCache(queryClient, mentorSubjectId);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manage instructors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Users marked as instructors and the mentor subjects they can teach.
          </p>
        </div>
        <Can permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW}>
          <Link
            href={ROUTES.MANAGER_INSTRUCTOR_SCHEDULES}
            className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
          >
            <CalendarDaysIcon data-icon="inline-start" />
            Instructor schedules
          </Link>
        </Can>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Instructors
            </h2>
            <p className="text-sm text-muted-foreground">
              Users with the instructor flag enabled.
            </p>
          </div>

          <Can permission={PERMISSIONS.INSTRUCTORS_CREATE}>
            <Button
              type="button"
              className="shrink-0"
              disabled={isRemovePending}
              onClick={() => setIsAddOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              Add instructors
            </Button>
          </Can>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedInstructors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No instructors yet. Add users to get started.
                    </td>
                  </tr>
                ) : (
                  paginatedInstructors.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 font-medium">
                        {row.username ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <UserRoleBadge role={row.role} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(row.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Can permission={PERMISSIONS.INSTRUCTORS_DELETE}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={isRemovePending}
                            onClick={() => setRemoveTarget(row)}
                            aria-label={`Remove ${row.username ?? row.email}`}
                          >
                            <Trash2Icon />
                          </Button>
                        </Can>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {rangeStart}–{rangeEnd} of {instructors.length}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="h-8 w-[4.5rem]" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    className="px-1 text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={page}
                    type="button"
                    variant={page === safeCurrentPage ? "default" : "outline"}
                    size="icon-sm"
                    onClick={() => setCurrentPage(page)}
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
      </section>

      <MentorSubjectsSection
        mentorSubjects={mentorSubjects}
        onMentorSubjectsChange={handleMentorSubjectsChange}
        onMentorSubjectDeleted={handleMentorSubjectDeleted}
        busy={isRemovePending}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Mentor subject capabilities
          </h2>
          <p className="text-sm text-muted-foreground">
            Toggle which mentor subjects each instructor can teach. Changes save
            immediately.
          </p>
        </div>

        {mentorSubjects.length === 0 ? (
          <div className="rounded-xl border px-4 py-10 text-center text-sm text-muted-foreground">
            Create a mentor subject first.
          </div>
        ) : (
          <InstructorCapabilitiesMatrix
            instructors={instructors}
            mentorSubjects={mentorSubjects}
            initialCapabilities={data.capabilities}
            canUpdate={canUpdateCapabilities}
            disabled={isRemovePending}
          />
        )}
      </section>

      <AddInstructorsDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        candidateUsers={candidateUsers}
        onAdded={(added) => {
          setInstructors((current) => {
            const existingIds = new Set(current.map((row) => row.id));
            const next = added.filter((row) => !existingIds.has(row.id));
            return next.length > 0 ? [...next, ...current] : current;
          });
          setCandidateUsers((current) => {
            const addedIds = new Set(added.map((row) => row.id));
            return current.filter((row) => !addedIds.has(row.id));
          });
          setCurrentPage(1);
        }}
      />

      <Dialog
        open={removeTarget !== null}
        onOpenChange={handleRemoveOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isRemovePending}
        >
          <DialogHeader>
            <DialogTitle>Remove instructor</DialogTitle>
            <DialogDescription>
              This clears all mentor subject capabilities for{" "}
              {removeTarget?.username ?? removeTarget?.email ?? "this user"} and
              turns off their instructor flag. Their account stays intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isRemovePending}
              onClick={() => handleRemoveOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isRemovePending}
              onClick={handleConfirmRemove}
            >
              {isRemovePending ? (
                <>
                  <InlineSpinner />
                  Removing…
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
