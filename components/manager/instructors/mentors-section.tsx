"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
  UserCheckIcon,
} from "lucide-react";
import { removeMentorAction } from "@/app/manager/instructors/actions";
import { Can } from "@/components/auth/can";
import { AddMentorsDialog } from "@/components/manager/instructors/add-mentors-dialog";
import { UserRoleBadge } from "@/components/manager/users/user-role-badge";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
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
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getPageNumbers } from "@/lib/pagination/page-numbers";
import type {
  ManagerMentorRow,
  RemoveMentorActionState,
} from "@/types/manager-mentor";

const PAGE_SIZE_OPTIONS = [4, 5, 10, 25] as const;

const initialRemoveState: RemoveMentorActionState = {};

type MentorsSectionProps = {
  mentors: ManagerMentorRow[];
  /** Keeps the capability matrix rows in sync with this table. */
  onMentorsChange: (mentors: ManagerMentorRow[]) => void;
  onMentorRemoved: (userId: string) => void;
};

export function MentorsSection({
  mentors,
  onMentorsChange,
  onMentorRemoved,
}: MentorsSectionProps) {

  const [removeTarget, setRemoveTarget] = useState<ManagerMentorRow | null>(
    null
  );
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(4);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRemoveTransitionPending, startRemoveTransition] = useTransition();
  const [removeState, removeFormAction, isRemoveActionPending] = useActionState(
    removeMentorAction,
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
      onMentorsChange(mentors.filter((row) => row.id !== nextState.userId));
      onMentorRemoved(nextState.userId);
    }
    setRemoveTarget(null);
  });

  const totalPages = Math.max(1, Math.ceil(mentors.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMentors = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return mentors.slice(startIndex, startIndex + pageSize);
  }, [mentors, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    mentors.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, mentors.length);

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

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-start @lg/panel:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Mentors</h2>
          <p className="text-sm text-muted-foreground">
            Users with the mentor flag enabled.
          </p>
        </div>

        <Can permission={PERMISSIONS.MENTORS_CREATE}>
          <Button
            type="button"
            className="shrink-0"
            disabled={isRemovePending}
            onClick={() => setIsAddOpen(true)}
          >
            <PlusIcon data-icon="inline-start" />
            Add mentors
          </Button>
        </Can>
      </div>

      <div className="overflow-hidden rounded-xl border">
        {paginatedMentors.length === 0 ? (
          <EmptyState
            size="sm"
            className="m-4"
            icon={UserCheckIcon}
            title="No mentors yet"
            description="Add users to get started."
          />
        ) : (
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
                {paginatedMentors.map((row) => (
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
                      <Can permission={PERMISSIONS.MENTORS_DELETE}>
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
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t px-4 py-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {rangeStart}–{rangeEnd} of {mentors.length}
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

      <AddMentorsDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAdded={(added) => {
          const existingIds = new Set(mentors.map((row) => row.id));
          const next = added.filter((row) => !existingIds.has(row.id));
          if (next.length > 0) {
            onMentorsChange([...next, ...mentors]);
          }
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
            <DialogTitle>Remove mentor</DialogTitle>
            <DialogDescription>
              This turns off the mentor flag for{" "}
              {removeTarget?.username ?? removeTarget?.email ?? "this user"}.
              Their account stays intact.
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
    </section>
  );
}
