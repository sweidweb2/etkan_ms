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
  loadGuestsPageAction,
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
  type GuestInterestedService,
} from "@/lib/constants/guest";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  ManagerGuestRow,
  ManagerGuestsListData,
  ManagerGuestsListQuery,
} from "@/types/manager-guest";
import type {
  AssignGuestToTeamActionState,
  DeleteTeamActionState,
  ManagerTeamRow,
} from "@/types/manager-team";

const GUEST_PAGE_SIZE_OPTIONS = [10, 15, 25] as const;
const GUEST_PAGE_SIZE_DEFAULT = 15;

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

function listQueryKey(query: {
  search: string;
  status: string;
  service: string;
  showClosed: boolean;
  page: number;
  pageSize: number;
}) {
  return `${query.search}|${query.status}|${query.service}|${query.showClosed}|${query.page}|${query.pageSize}`;
}

const initialAssignState: AssignGuestToTeamActionState = {};
const initialDeleteTeamState: DeleteTeamActionState = {};

type GuestPageSizeOption = (typeof GUEST_PAGE_SIZE_OPTIONS)[number];

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
  initialData: ManagerGuestsListData;
  initialTeams: ManagerTeamRow[];
};

export function ManageGuestsPanel({
  initialData,
  initialTeams,
}: ManageGuestsPanelProps) {
  const [guests, setGuests] = useState(() =>
    uniqueGuestsById(initialData.guests)
  );
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [teams, setTeams] = useState(initialTeams);
  const [isListLoading, startListTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [serviceFilter, setServiceFilter] = useState(FILTER_ALL);
  const [showClosedStatuses, setShowClosedStatuses] = useState(false);
  const [pageSize, setPageSize] = useState<GuestPageSizeOption>(
    (GUEST_PAGE_SIZE_OPTIONS as readonly number[]).includes(initialData.pageSize)
      ? (initialData.pageSize as GuestPageSizeOption)
      : GUEST_PAGE_SIZE_DEFAULT
  );
  const [currentPage, setCurrentPage] = useState(initialData.page);
  const loadedKeyRef = useRef(
    listQueryKey({
      search: "",
      status: FILTER_ALL,
      service: FILTER_ALL,
      showClosed: false,
      page: initialData.page,
      pageSize: initialData.pageSize,
    })
  );
  const requestIdRef = useRef(0);
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
    const guest =
      guests.find((row) => row.id === guestId) ??
      teams.flatMap((team) => team.guests).find((row) => row.id === guestId);
    if (!guest) {
      return;
    }
    const targetGroup = teamId ?? UNASSIGNED_GROUP;
    setTeams((current) =>
      applyGuestMove(current, {
        guest,
        targetGroup,
      }),
    );
    if (targetGroup === UNASSIGNED_GROUP) {
      setGuests((current) => uniqueGuestsById([guest, ...current]));
      setTotalCount((count) => count + 1);
    } else {
      setGuests((current) => current.filter((row) => row.id !== guestId));
      setTotalCount((count) => Math.max(0, count - 1));
    }
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
    const deleted = teams.find((team) => team.id === nextState.teamId);
    setTeams((current) => current.filter((row) => row.id !== nextState.teamId));
    if (deleted?.guests.length) {
      setGuests((current) =>
        uniqueGuestsById([...deleted.guests, ...current])
      );
      setTotalCount((count) => count + deleted.guests.length);
    }
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

  const buildListQuery = (
    overrides: Partial<{
      search: string;
      status: string;
      service: string;
      showClosed: boolean;
      page: number;
      pageSize: number;
    }> = {}
  ): ManagerGuestsListQuery => {
    const status = overrides.status ?? statusFilter;
    const service = overrides.service ?? serviceFilter;
    const showClosed = overrides.showClosed ?? showClosedStatuses;
    return {
      page: overrides.page ?? currentPage,
      pageSize: overrides.pageSize ?? pageSize,
      search: overrides.search ?? debouncedSearch,
      status:
        status === FILTER_ALL ? null : (status as GuestCurrentStatus),
      interestedService:
        service === FILTER_ALL
          ? null
          : (service as GuestInterestedService),
      unassignedOnly: true,
      includeClosed: showClosed,
    };
  };

  const loadPage = (query: ManagerGuestsListQuery) => {
    const requestId = ++requestIdRef.current;
    startListTransition(async () => {
      const data = await loadGuestsPageAction(query);
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (!data) {
        showErrorToast("Unable to load guests.");
        return;
      }
      setGuests(uniqueGuestsById(data.guests));
      setTotalCount(data.totalCount);
      if (data.page !== query.page) {
        loadedKeyRef.current = listQueryKey({
          search: query.search ?? "",
          status: query.status ?? FILTER_ALL,
          service: query.interestedService ?? FILTER_ALL,
          showClosed: showClosedStatuses,
          page: data.page,
          pageSize: data.pageSize,
        });
        setCurrentPage(data.page);
      }
    });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchQuery.trim();
      if (next !== debouncedSearch) {
        setDebouncedSearch(next);
        setCurrentPage(1);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [debouncedSearch, searchQuery]);

  useEffect(() => {
    const key = listQueryKey({
      search: debouncedSearch,
      status: statusFilter,
      service: serviceFilter,
      showClosed: showClosedStatuses,
      page: currentPage,
      pageSize,
    });
    if (key === loadedKeyRef.current) {
      return;
    }
    loadedKeyRef.current = key;
    loadPage(buildListQuery());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    debouncedSearch,
    pageSize,
    statusFilter,
    serviceFilter,
    showClosedStatuses,
  ]);

  const pageRows = guests;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const canShowMore = safeCurrentPage < totalPages;

  const dropTargetContext = useMemo<DropTargetContext>(() => {
    const teamIds = new Set(optimisticTeams.map((team) => team.id));
    const guestTeamById = new Map<string, string>();
    for (const team of optimisticTeams) {
      for (const guest of team.guests) {
        guestTeamById.set(guest.id, team.id);
      }
    }
    const unassignedGuestIds = new Set(guests.map((row) => row.id));
    return { teamIds, guestTeamById, unassignedGuestIds };
  }, [optimisticTeams, guests]);

  const pendingDropTargetRef = useRef<string | null>(null);

  const moveGuest = useCallback(
    (guestId: string, targetGroup: string) => {
      const guest =
        guests.find((row) => row.id === guestId) ??
        teams.flatMap((team) => team.guests).find((row) => row.id === guestId);
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
        if (targetGroup === UNASSIGNED_GROUP) {
          setGuests((current) => uniqueGuestsById([guest, ...current]));
        } else {
          setGuests((current) => current.filter((row) => row.id !== guestId));
        }
        assignFormAction(formData);
      });
    },
    [
      guests,
      teams,
      applyOptimisticMove,
      assignFormAction,
      startAssignTransition,
    ],
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

          <div className="flex w-full flex-col gap-3 @lg/panel:flex-row @lg/panel:flex-wrap @lg/panel:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="guest-filter-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name or phone…"
                aria-label="Search guests"
                className="pl-8"
              />
            </div>
            {SHOW_GUEST_FILTERS ? (
              <>
                <div className="w-full @lg/panel:w-44">
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
                      setCurrentPage(1);
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
              </>
            ) : null}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                {totalCount} unassigned
                {isListLoading ? <InlineSpinner /> : null}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  if (!value) return;
                  setPageSize(Number(value) as GuestPageSizeOption);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger size="sm" className="w-16" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  {GUEST_PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                    totalCount === 0 ? (
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

              <div className="flex items-center justify-between gap-3 border-t px-4 py-2">
                <span className="text-sm text-muted-foreground">
                  Page {safeCurrentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safeCurrentPage <= 1 || isListLoading}
                    onClick={() => setCurrentPage((page) => page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canShowMore || isListLoading}
                    onClick={() => setCurrentPage((page) => page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
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
              setGuests((current) => uniqueGuestsById([guest, ...current]));
              setTotalCount((count) => count + 1);
              setSearchQuery("");
              setDebouncedSearch("");
              setCurrentPage(1);
              loadedKeyRef.current = listQueryKey({
                search: "",
                status: statusFilter,
                service: serviceFilter,
                showClosed: showClosedStatuses,
                page: 1,
                pageSize,
              });
              loadPage({
                page: 1,
                pageSize,
                search: "",
                status:
                  statusFilter === FILTER_ALL
                    ? null
                    : (statusFilter as GuestCurrentStatus),
                interestedService:
                  serviceFilter === FILTER_ALL
                    ? null
                    : (serviceFilter as GuestInterestedService),
                unassignedOnly: true,
                includeClosed: showClosedStatuses,
              });
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
