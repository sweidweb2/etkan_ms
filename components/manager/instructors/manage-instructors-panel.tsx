"use client";

import {
  useActionState,
  useMemo,
  useState,
  useTransition,
} from "react";
import { format } from "date-fns";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import {
  removeInstructorAction,
  saveInstructorCapabilitiesAction,
} from "@/app/manager/instructors/actions";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { AddInstructorsDialog } from "@/components/manager/instructors/add-instructors-dialog";
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
  ManagerInstructorCapabilityPair,
  ManagerInstructorRow,
  ManagerInstructorsPageData,
  ManagerMentorSubjectColumn,
  RemoveInstructorActionState,
  SaveInstructorCapabilitiesActionState,
} from "@/types/manager-instructor";

const PAGE_SIZE_OPTIONS = [4, 5, 10, 25] as const;

const initialSaveState: SaveInstructorCapabilitiesActionState = {};
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

function pairKey(userId: string, mentorSubjectId: string) {
  return `${userId}:${mentorSubjectId}`;
}

function toCapabilitySet(pairs: ManagerInstructorCapabilityPair[]) {
  return new Set(
    pairs.map((pair) => pairKey(pair.user_id, pair.mentor_subject_id))
  );
}

export function ManageInstructorsPanel({ data }: ManageInstructorsPanelProps) {
  const permissions = usePermissions();
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

  const [isSaveTransitionPending, startSaveTransition] = useTransition();
  const [saveState, saveFormAction, isSaveActionPending] = useActionState(
    saveInstructorCapabilitiesAction,
    initialSaveState
  );
  const isSavePending = isSaveActionPending || isSaveTransitionPending;

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

  const [draftKeys, setDraftKeys] = useState(() =>
    toCapabilitySet(data.capabilities)
  );
  const [baselineKeys, setBaselineKeys] = useState(() =>
    toCapabilitySet(data.capabilities)
  );
  const capabilitiesKey = data.capabilities
    .map((pair) => pairKey(pair.user_id, pair.mentor_subject_id))
    .sort()
    .join("|");
  const [syncedCapabilitiesKey, setSyncedCapabilitiesKey] =
    useState(capabilitiesKey);

  if (capabilitiesKey !== syncedCapabilitiesKey) {
    setSyncedCapabilitiesKey(capabilitiesKey);
    const next = toCapabilitySet(data.capabilities);
    setDraftKeys(next);
    setBaselineKeys(next);
  }

  useActionStateToast(saveState, isSavePending);
  useActionStateToast(removeState, isRemovePending);

  useActionStateSuccess(saveState, isSavePending, (nextState) => {
    if (!nextState.capabilities) {
      return;
    }
    const next = toCapabilitySet(nextState.capabilities);
    setDraftKeys(next);
    setBaselineKeys(next);
  });

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
      setDraftKeys((current) => {
        const next = new Set<string>();
        for (const key of current) {
          if (!key.startsWith(`${nextState.userId}:`)) {
            next.add(key);
          }
        }
        return next;
      });
      setBaselineKeys((current) => {
        const next = new Set<string>();
        for (const key of current) {
          if (!key.startsWith(`${nextState.userId}:`)) {
            next.add(key);
          }
        }
        return next;
      });
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

  const isDirty = useMemo(() => {
    if (draftKeys.size !== baselineKeys.size) {
      return true;
    }
    for (const key of draftKeys) {
      if (!baselineKeys.has(key)) {
        return true;
      }
    }
    return false;
  }, [baselineKeys, draftKeys]);

  const matrixBusy = isSavePending || isRemovePending;

  function toggleCapability(
    userId: string,
    mentorSubjectId: string,
    checked: boolean
  ) {
    if (!canUpdateCapabilities || matrixBusy) {
      return;
    }

    const key = pairKey(userId, mentorSubjectId);
    setDraftKeys((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  function handleSave() {
    const capabilities: ManagerInstructorCapabilityPair[] = [...draftKeys].map(
      (key) => {
        const [user_id = "", mentor_subject_id = ""] = key.split(":");
        return { user_id, mentor_subject_id };
      }
    );

    const formData = new FormData();
    formData.set("capabilities", JSON.stringify(capabilities));

    startSaveTransition(() => {
      saveFormAction(formData);
    });
  }

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
    setDraftKeys((current) => {
      const next = new Set<string>();
      for (const key of current) {
        if (!key.endsWith(`:${mentorSubjectId}`)) {
          next.add(key);
        }
      }
      return next;
    });
    setBaselineKeys((current) => {
      const next = new Set<string>();
      for (const key of current) {
        if (!key.endsWith(`:${mentorSubjectId}`)) {
          next.add(key);
        }
      }
      return next;
    });
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
              disabled={matrixBusy}
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
                            disabled={matrixBusy}
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
        busy={matrixBusy}
      />

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Mentor subject capabilities
            </h2>
            <p className="text-sm text-muted-foreground">
              Check which mentor subjects each instructor can teach. Columns
              follow mentor subject order.
            </p>
          </div>

          <Can permission={PERMISSIONS.INSTRUCTORS_CAPABILITIES_UPDATE}>
            <Button
              type="button"
              className="shrink-0"
              disabled={
                !isDirty || matrixBusy || mentorSubjects.length === 0
              }
              onClick={handleSave}
            >
              {isSavePending ? (
                <>
                  <InlineSpinner className="mr-2" />
                  Saving…
                </>
              ) : (
                "Save capabilities"
              )}
            </Button>
          </Can>
        </div>

        {mentorSubjects.length === 0 ? (
          <div className="rounded-xl border px-4 py-10 text-center text-sm text-muted-foreground">
            Create a mentor subject first.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border [scrollbar-width:auto] [&::-webkit-scrollbar]:h-4 [&::-webkit-scrollbar-thumb]:rounded-full">
            <table className="w-max min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="sticky left-0 z-10 min-w-[10rem] bg-muted/40 px-4 py-3 font-medium backdrop-blur">
                    Instructor
                  </th>
                  {mentorSubjects.map((subject) => (
                    <th
                      key={subject.id}
                      className="min-w-[8rem] max-w-[10rem] px-3 py-3 text-center font-medium"
                      title={subject.name}
                    >
                      <span className="line-clamp-2">{subject.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {instructors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(mentorSubjects.length + 1, 2)}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      Add instructors to edit capabilities.
                    </td>
                  </tr>
                ) : (
                  instructors.map((instructor) => (
                    <tr
                      key={instructor.id}
                      className="border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <td
                        className={cn(
                          "sticky left-0 z-10 bg-background px-4 py-3 font-medium"
                        )}
                      >
                        {instructor.username ?? instructor.email}
                      </td>
                      {mentorSubjects.map((subject) => {
                        const checked = draftKeys.has(
                          pairKey(instructor.id, subject.id)
                        );
                        return (
                          <td
                            key={subject.id}
                            className="px-3 py-3 text-center"
                          >
                            <input
                              type="checkbox"
                              aria-label={`${instructor.username ?? instructor.email} — ${subject.name}`}
                              checked={checked}
                              disabled={!canUpdateCapabilities || matrixBusy}
                              onChange={(event) =>
                                toggleCapability(
                                  instructor.id,
                                  subject.id,
                                  event.target.checked
                                )
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
