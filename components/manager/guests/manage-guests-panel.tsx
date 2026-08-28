"use client";

import {
  useActionState,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SearchIcon } from "lucide-react";
import {
  assignGuestToTeamAction,
  deleteTeamAction,
} from "@/app/manager/guests/actions";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { AddGuestDialog } from "@/components/manager/guests/add-guest-dialog";
import { EditGuestDialog } from "@/components/manager/guests/edit-guest-dialog";
import {
  GuestRecordsTable,
  isClosedStatus,
  UNASSIGNED_GROUP,
} from "@/components/manager/guests/guest-records-table";
import { TeamFormDialog } from "@/components/manager/guests/team-form-dialog";
import { TeamsSection } from "@/components/manager/guests/teams-section";
import { ViewGuestNotesDialog } from "@/components/manager/guests/view-guest-notes-dialog";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  GUEST_CURRENT_STATUS_LABELS,
  GUEST_CURRENT_STATUS_VALUES,
  GUEST_INTERESTED_SERVICE_LABELS,
  GUEST_INTERESTED_SERVICE_VALUES,
  type GuestCurrentStatus,
} from "@/lib/constants/guest";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import type { ManagerGuestRow } from "@/types/manager-guest";
import type {
  AssignGuestToTeamActionState,
  DeleteTeamActionState,
  ManagerTeamRow,
} from "@/types/manager-team";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;

const FILTER_ALL = "all";

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

function uniqueGuestsById(rows: ManagerGuestRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) {
      return false;
    }
    seen.add(row.id);
    return true;
  });
}

function matchesSearch(guest: ManagerGuestRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    guest.full_name,
    guest.phone ?? "",
    guest.school_or_university ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

const initialAssignState: AssignGuestToTeamActionState = {};
const initialDeleteTeamState: DeleteTeamActionState = {};

type GuestMove = {
  guest: ManagerGuestRow;
  /** A team id, or `UNASSIGNED_GROUP` to send the guest back to the list. */
  targetGroup: string;
};

/** Pure move used for both the optimistic render and the committed result. */
function applyGuestMove(
  teams: ManagerTeamRow[],
  { guest, targetGroup }: GuestMove
): ManagerTeamRow[] {
  return teams.map((team) => {
    const withoutGuest = team.guests.filter((row) => row.id !== guest.id);

    if (team.id !== targetGroup) {
      return withoutGuest.length === team.guests.length
        ? team
        : { ...team, guests: withoutGuest };
    }

    return { ...team, guests: [...withoutGuest, guest] };
  });
}

/** Drop target that returns a guest from a team back to the main list. */
function UnassignedDropZone({ children }: { children: React.ReactNode }) {
  const { ref, isDropTarget } = useDroppable({
    id: UNASSIGNED_GROUP,
    type: "team",
    accept: "guest",
  });

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-x-auto transition-colors",
        isDropTarget && "bg-primary/5 ring-2 ring-inset ring-primary/40"
      )}
    >
      {children}
    </div>
  );
}

type ManageGuestsPanelProps = {
  initialGuests: ManagerGuestRow[];
  initialTeams: ManagerTeamRow[];
};

export function ManageGuestsPanel({
  initialGuests,
  initialTeams,
}: ManageGuestsPanelProps) {
  const [guests, setGuests] = useState(() => uniqueGuestsById(initialGuests));
  const [prevGuests, setPrevGuests] = useState(initialGuests);
  const [teams, setTeams] = useState(initialTeams);
  const [prevTeams, setPrevTeams] = useState(initialTeams);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [serviceFilter, setServiceFilter] = useState(FILTER_ALL);
  const [showClosedStatuses, setShowClosedStatuses] = useState(false);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [notesGuest, setNotesGuest] = useState<ManagerGuestRow | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<ManagerGuestRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [teamFormTarget, setTeamFormTarget] = useState<ManagerTeamRow | null>(
    null
  );
  const [deleteTeamTarget, setDeleteTeamTarget] =
    useState<ManagerTeamRow | null>(null);

  if (initialGuests !== prevGuests) {
    setPrevGuests(initialGuests);
    setGuests(uniqueGuestsById(initialGuests));
  }

  if (initialTeams !== prevTeams) {
    setPrevTeams(initialTeams);
    setTeams(initialTeams);
  }

  const permissions = usePermissions();
  const canAssignGuests = hasPermissionInSet(
    permissions,
    PERMISSIONS.TEAMS_ASSIGN_GUEST
  );

  const [isAssignTransitionPending, startAssignTransition] = useTransition();
  const [assignState, assignFormAction, isAssignActionPending] = useActionState(
    assignGuestToTeamAction,
    initialAssignState
  );
  const isAssignPending = isAssignActionPending || isAssignTransitionPending;

  const [isDeleteTeamTransitionPending, startDeleteTeamTransition] =
    useTransition();
  const [deleteTeamState, deleteTeamFormAction, isDeleteTeamActionPending] =
    useActionState(deleteTeamAction, initialDeleteTeamState);
  const isDeleteTeamPending =
    isDeleteTeamActionPending || isDeleteTeamTransitionPending;

  /**
   * Renders the move the moment the drag ends. React keeps the optimistic value
   * until the action settles, then drops it — a rejected move rolls back on its
   * own, and a successful one is committed to `teams` below.
   */
  const [optimisticTeams, applyOptimisticMove] = useOptimistic(
    teams,
    (current: ManagerTeamRow[], move: GuestMove) =>
      applyGuestMove(current, move)
  );

  useActionStateToast(assignState, isAssignPending);
  useActionStateToast(deleteTeamState, isDeleteTeamPending);

  useActionStateSuccess(assignState, isAssignPending, (nextState) => {
    const { guestId, teamId } = nextState;
    if (!guestId) {
      return;
    }
    const guest = guests.find((row) => row.id === guestId);
    if (!guest) {
      return;
    }
    setTeams((current) =>
      applyGuestMove(current, {
        guest,
        targetGroup: teamId ?? UNASSIGNED_GROUP,
      })
    );
  });

  useActionStateSuccess(deleteTeamState, isDeleteTeamPending, (nextState) => {
    if (!nextState.teamId) {
      return;
    }
    setTeams((current) => current.filter((row) => row.id !== nextState.teamId));
    setDeleteTeamTarget(null);
  });

  const handleDeleteTeamOpenChange = usePendingAwareOpenChange(
    isDeleteTeamPending,
    (open) => {
      if (!open) {
        setDeleteTeamTarget(null);
      }
    }
  );

  const teamIdByGuestId = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of optimisticTeams) {
      for (const guest of team.guests) {
        map.set(guest.id, team.id);
      }
    }
    return map;
  }, [optimisticTeams]);

  const allGuests = useMemo(() => uniqueGuestsById(guests), [guests]);

  /** The main table only lists guests that are not in a team. */
  const guestsById = useMemo(
    () => allGuests.filter((row) => !teamIdByGuestId.has(row.id)),
    [allGuests, teamIdByGuestId]
  );

  const stats = useMemo(() => {
    return {
      total: allGuests.length,
      scheduled: allGuests.filter((row) => row.status === "scheduled").length,
      finished: allGuests.filter((row) => row.status === "finished").length,
      cancelled: allGuests.filter((row) => row.status === "cancelled").length,
    };
  }, [allGuests]);

  const filteredGuests = useMemo(() => {
    return guestsById.filter((guest) => {
      if (!matchesSearch(guest, searchQuery)) {
        return false;
      }
      if (!showClosedStatuses && isClosedStatus(guest.status)) {
        return false;
      }
      if (statusFilter !== FILTER_ALL && guest.status !== statusFilter) {
        return false;
      }
      if (
        serviceFilter !== FILTER_ALL &&
        guest.interested_service !== serviceFilter
      ) {
        return false;
      }
      return true;
    });
  }, [
    guestsById,
    searchQuery,
    statusFilter,
    serviceFilter,
    showClosedStatuses,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredGuests.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filteredGuests.slice(pageStart, pageStart + pageSize);
  const pageNumbers = getPageNumbers(safePage, totalPages);

  /**
   * Resolve the group a drop landed on. The target is either a team container,
   * the guests table container, or another guest row inside one of them.
   */
  function resolveTargetGroup(targetId: string): string | null {
    if (targetId === UNASSIGNED_GROUP) {
      return UNASSIGNED_GROUP;
    }
    if (optimisticTeams.some((team) => team.id === targetId)) {
      return targetId;
    }
    const guestGroup = teamIdByGuestId.get(targetId);
    if (guestGroup) {
      return guestGroup;
    }
    return allGuests.some((row) => row.id === targetId)
      ? UNASSIGNED_GROUP
      : null;
  }

  function moveGuest(guestId: string, targetGroup: string) {
    const guest = allGuests.find((row) => row.id === guestId);
    if (!guest) {
      return;
    }

    const formData = new FormData();
    formData.set("guest_id", guestId);
    formData.set("team_id", targetGroup === UNASSIGNED_GROUP ? "" : targetGroup);

    startAssignTransition(() => {
      applyOptimisticMove({ guest, targetGroup });
      assignFormAction(formData);
    });
  }

  function handleDragEnd(event: {
    canceled: boolean;
    operation: { source: { id: string | number } | null; target: { id: string | number } | null };
  }) {
    if (event.canceled || !canAssignGuests) {
      return;
    }

    const { source, target } = event.operation;
    if (!source || !target) {
      return;
    }

    const guestId = String(source.id);
    const targetGroup = resolveTargetGroup(String(target.id));
    if (!targetGroup) {
      return;
    }

    const sourceGroup = teamIdByGuestId.get(guestId) ?? UNASSIGNED_GROUP;
    if (sourceGroup === targetGroup) {
      return;
    }

    // dnd-kit dispatches this from an insertion effect, which must not schedule
    // React updates. Let it finish tearing the drag down first.
    queueMicrotask(() => moveGuest(guestId, targetGroup));
  }

  function handleConfirmDeleteTeam() {
    if (!deleteTeamTarget) {
      return;
    }
    const formData = new FormData();
    formData.set("id", deleteTeamTarget.id);
    startDeleteTeamTransition(() => {
      deleteTeamFormAction(formData);
    });
  }

  return (
    <TooltipProvider>
      <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Guests</h1>
            <p className="text-sm text-muted-foreground">
              Pre-user intake cards before registration and team handoff.
            </p>
          </div>
          <Can permission={PERMISSIONS.GUESTS_CREATE}>
            <Button type="button" onClick={() => setIsAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Create guest
            </Button>
          </Can>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UserStatCard
            label="Total"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Scheduled"
            value={stats.scheduled}
            accentClassName="border-l-violet-500"
          />
          <UserStatCard
            label="Finished"
            value={stats.finished}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Cancelled"
            value={stats.cancelled}
            accentClassName="border-l-amber-500"
          />
        </div>

        <Card>
          <CardHeader className="gap-4 border-b">
            <CardTitle className="text-base">Guest list</CardTitle>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grid w-full gap-1.5 sm:w-56">
                <Label htmlFor="guest-filter-search">Search</Label>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="guest-filter-search"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Name or phone"
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="grid w-full gap-1.5 sm:w-44">
                <Label htmlFor="guest-filter-status">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    if (!value) return;
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    id="guest-filter-status"
                    className="w-full"
                  >
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All statuses</SelectItem>
                    {GUEST_CURRENT_STATUS_VALUES.filter(
                      (value) => showClosedStatuses || !isClosedStatus(value)
                    ).map((value) => (
                      <SelectItem key={value} value={value}>
                        {GUEST_CURRENT_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid w-full gap-1.5 sm:w-44">
                <Label htmlFor="guest-filter-service">Service</Label>
                <Select
                  value={serviceFilter}
                  onValueChange={(value) => {
                    if (!value) return;
                    setServiceFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    id="guest-filter-service"
                    className="w-full"
                  >
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All services</SelectItem>
                    {GUEST_INTERESTED_SERVICE_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {GUEST_INTERESTED_SERVICE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 sm:h-9">
                <Checkbox
                  id="guest-filter-show-closed"
                  checked={showClosedStatuses}
                  onCheckedChange={(checked) => {
                    setShowClosedStatuses(checked);
                    if (
                      !checked &&
                      statusFilter !== FILTER_ALL &&
                      isClosedStatus(statusFilter as GuestCurrentStatus)
                    ) {
                      setStatusFilter(FILTER_ALL);
                    }
                    setCurrentPage(1);
                  }}
                />
                <Label
                  htmlFor="guest-filter-show-closed"
                  className="cursor-pointer font-normal"
                >
                  Show rejected, cancelled &amp; finished
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <UnassignedDropZone>
              <GuestRecordsTable
                guests={pageRows}
                group={UNASSIGNED_GROUP}
                showDragColumn={canAssignGuests}
                canDrag={canAssignGuests}
                disabled={false}
                onViewNotes={(guest) => {
                  setNotesGuest(guest);
                  setIsNotesOpen(true);
                }}
                onEditGuest={(guest) => {
                  setEditGuest(guest);
                  setIsEditOpen(true);
                }}
                emptyState={
                  guestsById.length === 0 ? (
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <p>
                        No guests yet. Create the first intake card to start
                        follow-up.
                      </p>
                      <Can permission={PERMISSIONS.GUESTS_CREATE}>
                        <Button type="button" onClick={() => setIsAddOpen(true)}>
                          <PlusIcon data-icon="inline-start" />
                          Create guest
                        </Button>
                      </Can>
                    </div>
                  ) : (
                    "No guests match these filters."
                  )
                }
              />
            </UnassignedDropZone>

            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {filteredGuests.length} guest
                  {filteredGuests.length === 1 ? "" : "s"}
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    if (!value) return;
                    setPageSize(
                      Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]
                    );
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[4.5rem]">
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
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  <ChevronLeftIcon />
                </Button>
                {pageNumbers.map((page, index) =>
                  page === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-2 text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={page}
                      type="button"
                      variant={page === safePage ? "default" : "outline"}
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
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Can permission={PERMISSIONS.TEAMS_VIEW}>
          <TeamsSection
            teams={optimisticTeams}
            canDrag={canAssignGuests}
            isSaving={isAssignPending}
            disabled={isDeleteTeamPending}
            onCreate={() => {
              setTeamFormTarget(null);
              setIsTeamFormOpen(true);
            }}
            onEdit={(team) => {
              setTeamFormTarget(team);
              setIsTeamFormOpen(true);
            }}
            onDelete={(team) => setDeleteTeamTarget(team)}
            onViewNotes={(guest) => {
              setNotesGuest(guest);
              setIsNotesOpen(true);
            }}
            onEditGuest={(guest) => {
              setEditGuest(guest);
              setIsEditOpen(true);
            }}
          />
        </Can>

        <TeamFormDialog
          open={isTeamFormOpen}
          onOpenChange={(open) => {
            setIsTeamFormOpen(open);
            if (!open) {
              setTeamFormTarget(null);
            }
          }}
          team={teamFormTarget}
          onSaved={(team) => {
            setTeams((current) =>
              current.some((row) => row.id === team.id)
                ? current.map((row) => (row.id === team.id ? team : row))
                : [team, ...current]
            );
          }}
        />

        <Dialog
          open={deleteTeamTarget !== null}
          onOpenChange={handleDeleteTeamOpenChange}
        >
          <DialogContent showCloseButton={!isDeleteTeamPending}>
            <DialogHeader>
              <DialogTitle>Delete team</DialogTitle>
              <DialogDescription>
                {deleteTeamTarget
                  ? `"${deleteTeamTarget.name}" will be deleted. ${
                      deleteTeamTarget.guests.length === 0
                        ? "It has no guests."
                        : `Its ${deleteTeamTarget.guests.length} guest${
                            deleteTeamTarget.guests.length === 1 ? "" : "s"
                          } will move back to the guest list.`
                    }`
                  : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeleteTeamOpenChange(false)}
                disabled={isDeleteTeamPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDeleteTeam}
                disabled={isDeleteTeamPending}
              >
                {isDeleteTeamPending ? (
                  <>
                    <InlineSpinner />
                    Deleting
                  </>
                ) : (
                  "Delete team"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AddGuestDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onGuestCreated={(guest) => {
            setGuests((current) => {
              if (current.some((row) => row.id === guest.id)) {
                return current;
              }

              return [guest, ...current];
            });
            setCurrentPage(1);
          }}
        />

        <ViewGuestNotesDialog
          open={isNotesOpen}
          onOpenChange={(open) => {
            setIsNotesOpen(open);
            if (!open) {
              setNotesGuest(null);
            }
          }}
          guest={notesGuest}
        />

        {editGuest ? (
          <EditGuestDialog
            open={isEditOpen}
            onOpenChange={(open) => {
              setIsEditOpen(open);
              if (!open) {
                setEditGuest(null);
              }
            }}
            guest={editGuest}
            onGuestUpdated={(guest) => {
              setGuests((current) =>
                current.map((row) => (row.id === guest.id ? guest : row))
              );
              setEditGuest(guest);
            }}
          />
        ) : null}
      </div>
      </DragDropProvider>
    </TooltipProvider>
  );
}
