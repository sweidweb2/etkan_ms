"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  DragDropProvider,
  useDragDropManager,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { BellIcon, PlusIcon, SearchIcon } from "lucide-react";
import {
  assignGuestToTeamAction,
  deleteTeamAction,
} from "@/app/manager/guests/actions";
import { loadNotificationsPageAction } from "@/app/manager/notifications/actions";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { AddGuestDialog } from "@/components/manager/guests/add-guest-dialog";
import { EditGuestDialog } from "@/components/manager/guests/edit-guest-dialog";
import { GuestRegistrationNotificationsSheet } from "@/components/manager/guests/guest-registration-notifications-sheet";
import {
  GuestRecordsTable,
  isClosedStatus,
  UNASSIGNED_GROUP,
} from "@/components/manager/guests/guest-records-table";
import { TeamFormDialog } from "@/components/manager/guests/team-form-dialog";
import { TeamsSection } from "@/components/manager/guests/teams-section";
import { ViewGuestNotesDialog } from "@/components/manager/guests/view-guest-notes-dialog";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ManagerGuestRow } from "@/types/manager-guest";
import type {
  AssignGuestToTeamActionState,
  DeleteTeamActionState,
  ManagerTeamRow,
} from "@/types/manager-team";

const GUEST_LIST_BATCH_SIZE = 15;
const GUEST_LIST_MAX_ROWS = 100;

const FILTER_ALL = "all";
/** Guest list filters are hidden for now; flip to bring them back. */
const SHOW_GUEST_FILTERS = false;

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
    guest.email ?? "",
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
  { guest, targetGroup }: GuestMove,
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

type DropTargetContext = {
  teamIds: Set<string>;
  guestTeamById: Map<string, string>;
  unassignedGuestIds: Set<string>;
};

function resolveGuestDropTarget(
  operation: DragEndEvent["operation"],
  context: DropTargetContext,
): string | null {
  const { source, target } = operation;
  if (!source) {
    return null;
  }

  const resolveEntityId = (entityId: string): string | null => {
    if (entityId === UNASSIGNED_GROUP) {
      return UNASSIGNED_GROUP;
    }
    if (context.teamIds.has(entityId)) {
      return entityId;
    }
    const guestTeamId = context.guestTeamById.get(entityId);
    if (guestTeamId) {
      return guestTeamId;
    }
    if (context.unassignedGuestIds.has(entityId)) {
      return UNASSIGNED_GROUP;
    }
    return null;
  };

  if (target) {
    const fromTarget = resolveEntityId(String(target.id));
    if (fromTarget) {
      return fromTarget;
    }
  }

  return null;
}

/**
 * Listens for drag events without DragDropProvider's trackRendering wrapper,
 * which schedules React updates during dnd-kit teardown and can swallow moves.
 */
function GuestTeamDragMonitor({
  enabled,
  onDragOver,
  onDragEnd,
}: {
  enabled: boolean;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const manager = useDragDropManager();
  const onDragOverRef = useRef(onDragOver);
  const onDragEndRef = useRef(onDragEnd);

  useEffect(() => {
    onDragOverRef.current = onDragOver;
    onDragEndRef.current = onDragEnd;
  }, [onDragOver, onDragEnd]);

  useEffect(() => {
    if (!manager || !enabled) {
      return;
    }

    const unsubscribeOver = manager.monitor.addEventListener(
      "dragover",
      (event: DragOverEvent) => {
        onDragOverRef.current(event);
      },
    );
    const unsubscribeEnd = manager.monitor.addEventListener(
      "dragend",
      (event: DragEndEvent) => {
        onDragEndRef.current(event);
      },
    );

    return () => {
      unsubscribeOver();
      unsubscribeEnd();
    };
  }, [manager, enabled]);

  return null;
}

/** Drop target that returns a guest from a team back to the main list. */
function UnassignedDropZone({ children }: { children: React.ReactNode }) {
  const { ref, isDropTarget } = useDroppable({
    id: UNASSIGNED_GROUP,
    accept: "guest",
    collisionPriority: CollisionPriority.High,
  });

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-x-auto transition-colors",
        isDropTarget && "bg-primary/5 ring-2 ring-inset ring-primary/40",
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
  const [prevInitialGuests, setPrevInitialGuests] = useState(initialGuests);
  const [teams, setTeams] = useState(initialTeams);

  if (initialGuests !== prevInitialGuests) {
    setPrevInitialGuests(initialGuests);
    setGuests(uniqueGuestsById(initialGuests));
  }
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [serviceFilter, setServiceFilter] = useState(FILTER_ALL);
  const [showClosedStatuses, setShowClosedStatuses] = useState(false);
  const [visibleCount, setVisibleCount] = useState(GUEST_LIST_BATCH_SIZE);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRegistrationNotifsOpen, setIsRegistrationNotifsOpen] =
    useState(false);
  const [registrationUnreadCount, setRegistrationUnreadCount] = useState(0);
  const [notesGuest, setNotesGuest] = useState<ManagerGuestRow | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<ManagerGuestRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [teamFormTarget, setTeamFormTarget] = useState<ManagerTeamRow | null>(
    null,
  );
  const [deleteTeamTarget, setDeleteTeamTarget] =
    useState<ManagerTeamRow | null>(null);

  const [isAssignTransitionPending, startAssignTransition] = useTransition();
  const [assignState, assignFormAction, isAssignActionPending] = useActionState(
    assignGuestToTeamAction,
    initialAssignState,
  );
  const isAssignPending = isAssignActionPending || isAssignTransitionPending;

  const permissions = usePermissions();
  const canAssignGuests = hasPermissionInSet(
    permissions,
    PERMISSIONS.TEAMS_ASSIGN_GUEST,
  );
  const canViewTeams = hasPermissionInSet(permissions, PERMISSIONS.TEAMS_VIEW);
  const canViewNotifications = hasPermissionInSet(
    permissions,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  );

  useEffect(() => {
    if (!canViewNotifications) {
      return;
    }

    let cancelled = false;
    void loadNotificationsPageAction({
      page: 1,
      pageSize: 1,
      category: "registration",
      readFilter: "unread",
    }).then((page) => {
      if (!cancelled) {
        setRegistrationUnreadCount(page.total);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [canViewNotifications]);

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
      applyGuestMove(current, move),
  );

  useActionStateToast(assignState, isAssignActionPending);
  useActionStateToast(deleteTeamState, isDeleteTeamActionPending);

  useActionStateSuccess(assignState, isAssignActionPending, (nextState) => {
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
      }),
    );
  });

  useActionStateSuccess(
    assignState,
    isAssignActionPending,
    () => {
      setTeams(initialTeams);
    },
    (nextState) => nextState.success === false,
  );

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
    },
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
    [allGuests, teamIdByGuestId],
  );

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

  const pageRows = filteredGuests.slice(0, visibleCount);
  const canShowMore =
    visibleCount < GUEST_LIST_MAX_ROWS && filteredGuests.length > visibleCount;

  const dropTargetContext = useMemo<DropTargetContext>(() => {
    const teamIds = new Set(optimisticTeams.map((team) => team.id));
    const guestTeamById = new Map<string, string>();
    for (const team of optimisticTeams) {
      for (const guest of team.guests) {
        guestTeamById.set(guest.id, team.id);
      }
    }
    const unassignedGuestIds = new Set(
      allGuests
        .filter((row) => !guestTeamById.has(row.id))
        .map((row) => row.id),
    );
    return { teamIds, guestTeamById, unassignedGuestIds };
  }, [optimisticTeams, allGuests]);

  const pendingDropTargetRef = useRef<string | null>(null);

  const moveGuest = useCallback(
    (guestId: string, targetGroup: string) => {
      const guest = allGuests.find((row) => row.id === guestId);
      if (!guest) {
        showErrorToast("Guest not found.");
        return;
      }

      const formData = new FormData();
      formData.set("guest_id", guestId);
      formData.set(
        "team_id",
        targetGroup === UNASSIGNED_GROUP ? "" : targetGroup,
      );

      startAssignTransition(() => {
        const move = { guest, targetGroup };
        applyOptimisticMove(move);
        setTeams((current) => applyGuestMove(current, move));
        assignFormAction(formData);
      });
    },
    [allGuests, applyOptimisticMove, assignFormAction, startAssignTransition],
  );

  const handleGuestDragOver = useCallback(
    (event: DragOverEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      const targetGroup = resolveGuestDropTarget(
        event.operation,
        dropTargetContext,
      );
      if (targetGroup) {
        pendingDropTargetRef.current = targetGroup;
      }
    },
    [dropTargetContext],
  );

  const handleGuestDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { source } = event.operation;
      if (!source) {
        pendingDropTargetRef.current = null;
        return;
      }

      const guestId = String(source.id);
      const targetGroup =
        pendingDropTargetRef.current ??
        resolveGuestDropTarget(event.operation, dropTargetContext);
      pendingDropTargetRef.current = null;

      if (!targetGroup) {
        showErrorToast("Drop the guest on a team or the guest list.");
        return;
      }

      const sourceGroup =
        dropTargetContext.guestTeamById.get(guestId) ?? UNASSIGNED_GROUP;
      if (sourceGroup === targetGroup) {
        return;
      }

      moveGuest(guestId, targetGroup);
    },
    [dropTargetContext, moveGuest],
  );

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
      <DragDropProvider>
        <GuestTeamDragMonitor
          enabled={canAssignGuests}
          onDragOver={handleGuestDragOver}
          onDragEnd={handleGuestDragEnd}
        />
        <div className="flex flex-col gap-6">
          <PanelPageHeader title="Guests" />
          <div className="flex flex-wrap items-center justify-end gap-2 empty:hidden">
            <Can permission={PERMISSIONS.NOTIFICATIONS_VIEW}>
              <Button
                type="button"
                variant="outline"
              onClick={() => setIsRegistrationNotifsOpen(true)}
              className="relative mr-auto"
                aria-label={
                  registrationUnreadCount > 0
                    ? `Registration alerts, ${registrationUnreadCount} unread`
                    : "Registration alerts"
                }
              >
                <BellIcon data-icon="inline-start" />
                Registration alerts
                {registrationUnreadCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-1 size-2 rounded-full bg-red-500 ring-2 ring-background"
                  />
                ) : null}
              </Button>
            </Can>
            {canViewTeams ? (
              <Can permission={PERMISSIONS.TEAMS_CREATE}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isDeleteTeamPending}
                  onClick={() => {
                    setTeamFormTarget(null);
                    setIsTeamFormOpen(true);
                  }}
                >
                  <PlusIcon data-icon="inline-start" />
                  Create team
                </Button>
              </Can>
            ) : null}
            <Can permission={PERMISSIONS.GUESTS_CREATE}>
              <Button type="button" onClick={() => setIsAddOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Create guest
              </Button>
            </Can>
          </div>

          <GuestRegistrationNotificationsSheet
            open={isRegistrationNotifsOpen}
            onOpenChange={setIsRegistrationNotifsOpen}
            onUnreadCountChange={setRegistrationUnreadCount}
          />

          {SHOW_GUEST_FILTERS ? (
            <div className="flex w-full flex-col gap-3 @lg/panel:flex-row @lg/panel:flex-wrap @lg/panel:items-center">
              <div className="relative w-full @lg/panel:w-56">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="guest-filter-search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setVisibleCount(GUEST_LIST_BATCH_SIZE);
                  }}
                  placeholder="Search name or phone…"
                  aria-label="Search guests"
                  className="pl-8"
                />
              </div>
              <div className="w-full @lg/panel:w-44">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    if (!value) return;
                    setStatusFilter(value);
                    setVisibleCount(GUEST_LIST_BATCH_SIZE);
                  }}
                >
                  <SelectTrigger
                    id="guest-filter-status"
                    aria-label="Filter by status"
                    className="w-full"
                  >
                    <SelectValue placeholder="Status">
                      {(value) =>
                        !value || value === FILTER_ALL
                          ? "Status"
                          : (GUEST_CURRENT_STATUS_LABELS[
                              value as GuestCurrentStatus
                            ] ?? String(value))
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All statuses</SelectItem>
                    {GUEST_CURRENT_STATUS_VALUES.filter(
                      (value) => showClosedStatuses || !isClosedStatus(value),
                    ).map((value) => (
                      <SelectItem key={value} value={value}>
                        {GUEST_CURRENT_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full @lg/panel:w-44">
                <Select
                  value={serviceFilter}
                  onValueChange={(value) => {
                    if (!value) return;
                    setServiceFilter(value);
                    setVisibleCount(GUEST_LIST_BATCH_SIZE);
                  }}
                >
                  <SelectTrigger
                    id="guest-filter-service"
                    aria-label="Filter by service"
                    className="w-full"
                  >
                    <SelectValue placeholder="Service">
                      {(value) =>
                        !value || value === FILTER_ALL
                          ? "Service"
                          : (GUEST_INTERESTED_SERVICE_LABELS[
                              value as keyof typeof GUEST_INTERESTED_SERVICE_LABELS
                            ] ?? String(value))
                      }
                    </SelectValue>
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
                    setVisibleCount(GUEST_LIST_BATCH_SIZE);
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
          ) : null}

          <Card className="gap-0 py-0">
            <CardContent className="p-0">
              <UnassignedDropZone>
                <GuestRecordsTable
                  guests={pageRows}
                  showDragColumn={canAssignGuests}
                  canDrag={canAssignGuests}
                  disabled={isAssignPending}
                  showEmailAndSchool={false}
                  onViewNotes={(guest) => {
                    setNotesGuest(guest);
                    setIsNotesOpen(true);
                  }}
                  onEditGuest={(guest) => {
                    setEditGuest(guest);
                    setIsEditOpen(true);
                  }}
                  moveDown={
                    canAssignGuests && canViewTeams && optimisticTeams[0]
                      ? {
                          label: `Move to ${optimisticTeams[0].name}`,
                          onMove: (guest) =>
                            moveGuest(guest.id, optimisticTeams[0].id),
                        }
                      : undefined
                  }
                  emptyState={
                    guestsById.length === 0 ? (
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                        <p>
                          No guests yet. Create the first intake card to start
                          follow-up.
                        </p>
                        <Can permission={PERMISSIONS.GUESTS_CREATE}>
                          <Button
                            type="button"
                            onClick={() => setIsAddOpen(true)}
                          >
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

              {canShowMore ? (
                <div className="flex justify-center border-t px-4 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setVisibleCount((count) =>
                        Math.min(
                          count + GUEST_LIST_BATCH_SIZE,
                          GUEST_LIST_MAX_ROWS,
                        ),
                      )
                    }
                  >
                    Show more
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Can permission={PERMISSIONS.TEAMS_VIEW}>
            <TeamsSection
              teams={optimisticTeams}
              canDrag={canAssignGuests}
              dragDisabled={isAssignPending}
              disabled={isDeleteTeamPending}
              onEdit={(team) => {
                setTeamFormTarget(team);
                setIsTeamFormOpen(true);
              }}
              onDelete={(team) => setDeleteTeamTarget(team)}
              onMoveGuest={(guest, targetGroup) =>
                moveGuest(guest.id, targetGroup)
              }
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
                  : [team, ...current],
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
              setVisibleCount(GUEST_LIST_BATCH_SIZE);
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
                  current.map((row) => (row.id === guest.id ? guest : row)),
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
