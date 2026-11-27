"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { GripVerticalIcon, LayersIcon, PlusIcon } from "lucide-react";
import {
  reorderSemesterTeamsAction,
  saveSemesterBoardAction,
} from "@/app/manager/semesters/actions";
import { Can } from "@/components/auth/can";
import { KanbanBoardScroll } from "@/components/manager/kanban/kanban-board-scroll";
import { KanbanColumnDropIndicator } from "@/components/manager/kanban/kanban-drop-indicators";
import { KanbanDragOverlay } from "@/components/manager/kanban/kanban-drag-overlay";
import { PointerKanbanColumn } from "@/components/manager/kanban/pointer-kanban-column";
import { PhaseCard } from "@/components/manager/phases/phase-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePointerKanbanBoard } from "@/hooks/use-pointer-kanban-board";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSemesterDetailRoute } from "@/lib/constants/routes";
import { UNASSIGNED_TEAM_ID } from "@/lib/constants/semester-team";
import { COLUMN_OVERLAY_PREVIEW_CARDS } from "@/lib/kanban/pointer-drag-types";
import {
  applyTeamOrder,
  applySemesterBoardColumns,
  buildSemesterBoardColumns,
  type SemesterBoardColumns,
} from "@/lib/semesters/semester-board-state";
import { cn } from "@/lib/utils";
import type {
  ManagerSemesterTeamRow,
  ReorderSemesterTeamsActionState,
  SaveSemesterBoardActionState,
} from "@/types/manager-semester-team";
import type { ManagerSemesterRow } from "@/types/manager-phase";

type SemestersKanbanBoardProps = {
  semesters: ManagerSemesterRow[];
  teams: ManagerSemesterTeamRow[];
  canDragCards: boolean;
  canReorderTeams: boolean;
  sortingEnabled: boolean;
  onSemestersChange: (semesters: ManagerSemesterRow[]) => void;
  onTeamsChange: (teams: ManagerSemesterTeamRow[]) => void;
  onRequestCreateTeam: () => void;
};

export function SemestersKanbanBoard({
  semesters,
  teams,
  canDragCards,
  canReorderTeams,
  sortingEnabled,
  onSemestersChange,
  onTeamsChange,
  onRequestCreateTeam,
}: SemestersKanbanBoardProps) {
  const router = useRouter();
  const [columns, setColumns] = useState<SemesterBoardColumns>(() =>
    buildSemesterBoardColumns(semesters, teams)
  );
  const [columnOrder, setColumnOrder] = useState(() =>
    [...teams]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((team) => team.id)
  );
  const [prevSemesters, setPrevSemesters] = useState(semesters);
  const [prevTeams, setPrevTeams] = useState(teams);

  const [optimisticColumns, applyOptimisticColumns] = useOptimistic(
    columns,
    (_current: SemesterBoardColumns, next: SemesterBoardColumns) => next
  );
  const [optimisticColumnOrder, applyOptimisticColumnOrder] = useOptimistic(
    columnOrder,
    (_current: string[], next: string[]) => next
  );

  const columnsRef = useRef(columns);
  const columnOrderRef = useRef(columnOrder);
  const boardRollbackRef = useRef<{
    columns: SemesterBoardColumns;
    semesters: ManagerSemesterRow[];
  } | null>(null);
  const teamsRollbackRef = useRef<{
    order: string[];
    teams: ManagerSemesterTeamRow[];
  } | null>(null);

  const semestersById = useMemo(() => {
    const map = new Map<string, ManagerSemesterRow>();
    for (const semester of semesters) {
      map.set(semester.id, semester);
    }
    return map;
  }, [semesters]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    columnOrderRef.current = columnOrder;
  }, [columnOrder]);

  const [isBoardPending, startBoardTransition] = useTransition();
  const [isTeamsPending, startTeamsTransition] = useTransition();
  const [boardState, boardAction, isBoardActionPending] = useFormActionState(
    saveSemesterBoardAction,
    {} as SaveSemesterBoardActionState
  );
  const [teamsState, teamsAction, isTeamsActionPending] = useFormActionState(
    reorderSemesterTeamsAction,
    {} as ReorderSemesterTeamsActionState
  );

  const isPending =
    isBoardPending ||
    isTeamsPending ||
    isBoardActionPending ||
    isTeamsActionPending;

  useActionStateToast(boardState, isBoardPending || isBoardActionPending);
  useActionStateToast(teamsState, isTeamsPending || isTeamsActionPending);

  useActionStateSuccess(
    boardState,
    isBoardPending || isBoardActionPending,
    () => {
      boardRollbackRef.current = null;
    }
  );
  useActionStateSuccess(
    boardState,
    isBoardPending || isBoardActionPending,
    () => {
      const rollback = boardRollbackRef.current;
      boardRollbackRef.current = null;
      if (!rollback) {
        return;
      }
      setColumns(rollback.columns);
      columnsRef.current = rollback.columns;
      onSemestersChange(rollback.semesters);
    },
    (state) => state.success === false
  );

  useActionStateSuccess(
    teamsState,
    isTeamsPending || isTeamsActionPending,
    (state) => {
      teamsRollbackRef.current = null;
      if (state.teams) {
        onTeamsChange(state.teams);
        setColumnOrder(
          [...state.teams]
            .sort((left, right) => left.sort_order - right.sort_order)
            .map((team) => team.id)
        );
      }
    }
  );
  useActionStateSuccess(
    teamsState,
    isTeamsPending || isTeamsActionPending,
    () => {
      const rollback = teamsRollbackRef.current;
      teamsRollbackRef.current = null;
      if (!rollback) {
        return;
      }
      setColumnOrder(rollback.order);
      columnOrderRef.current = rollback.order;
      onTeamsChange(rollback.teams);
    },
    (state) => state.success === false
  );

  if (semesters !== prevSemesters || teams !== prevTeams) {
    setPrevSemesters(semesters);
    setPrevTeams(teams);
    setColumns(buildSemesterBoardColumns(semesters, teams));
    setColumnOrder(
      [...teams]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((team) => team.id)
    );
  }

  const persistColumns = useCallback(
    (nextColumns: SemesterBoardColumns) => {
      const nextSemesters = applySemesterBoardColumns(semesters, nextColumns);
      boardRollbackRef.current = {
        columns: columnsRef.current,
        semesters,
      };

      const formData = new FormData();
      formData.set("columns", JSON.stringify(nextColumns));

      startBoardTransition(() => {
        applyOptimisticColumns(nextColumns);
        setColumns(nextColumns);
        columnsRef.current = nextColumns;
        onSemestersChange(nextSemesters);
        boardAction(formData);
      });
    },
    [
      semesters,
      onSemestersChange,
      boardAction,
      startBoardTransition,
      applyOptimisticColumns,
    ]
  );

  const persistTeamOrder = useCallback(
    (orderedIds: string[]) => {
      const nextTeams = applyTeamOrder(teams, orderedIds);
      teamsRollbackRef.current = {
        order: columnOrderRef.current,
        teams,
      };

      const formData = new FormData();
      formData.set("ordered_ids", JSON.stringify(orderedIds));

      startTeamsTransition(() => {
        applyOptimisticColumnOrder(orderedIds);
        setColumnOrder(orderedIds);
        columnOrderRef.current = orderedIds;
        onTeamsChange(nextTeams);
        teamsAction(formData);
      });
    },
    [
      teams,
      onTeamsChange,
      teamsAction,
      startTeamsTransition,
      applyOptimisticColumnOrder,
    ]
  );

  const onCardActivate = useCallback(
    (cardId: string) => {
      router.push(getManagerSemesterDetailRoute(cardId));
    },
    [router]
  );

  const {
    mounted,
    cardDrag,
    columnDrag,
    columnIndicatorDisplayIndex,
    isBoardDragging,
    boardScrollRef,
    canPan,
    isPanning,
    scrollProps,
    refreshOverflow,
    setColumnNode,
    setListNode,
    handleCardPointerDown,
    handleColumnHeaderPointerDown,
  } = usePointerKanbanBoard({
    columns,
    columnOrder,
    canDragCards,
    canReorderColumns: canReorderTeams,
    sortingEnabled,
    isPending,
    onPersistColumns: persistColumns,
    onPersistColumnOrder: persistTeamOrder,
    onCardActivate,
  });

  useEffect(() => {
    refreshOverflow();
  }, [
    optimisticColumns,
    optimisticColumnOrder,
    teams.length,
    semesters.length,
    refreshOverflow,
  ]);

  const handleColumnCardPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      semester: ManagerSemesterRow,
      columnId: string,
      index: number
    ) => {
      handleCardPointerDown(event, semester.id, columnId, index);
    },
    [handleCardPointerDown]
  );

  if (semesters.length === 0 && teams.length === 0) {
    return (
      <EmptyState
        icon={LayersIcon}
        title="No semesters yet"
        description="Create a semester or team to get started."
      />
    );
  }

  const orderedTeams = optimisticColumnOrder
    .map((id) => teams.find((team) => team.id === id))
    .filter((team): team is ManagerSemesterTeamRow => Boolean(team));

  const draggingSemester = cardDrag
    ? semestersById.get(cardDrag.draggingCardId)
    : null;

  const draggingTeam = columnDrag
    ? teams.find((team) => team.id === columnDrag.draggingColumnId)
    : null;
  const draggingTeamSemesters = columnDrag
    ? (optimisticColumns[columnDrag.draggingColumnId] ?? [])
        .map((id) => semestersById.get(id))
        .filter((row): row is ManagerSemesterRow => Boolean(row))
        .slice(0, COLUMN_OVERLAY_PREVIEW_CARDS)
    : [];

  return (
    <>
      <KanbanBoardScroll
        boardScrollRef={boardScrollRef}
        scrollProps={scrollProps}
        canPan={canPan}
        isPanning={isPanning}
        isBoardDragging={isBoardDragging}
      >
        <PointerKanbanColumn
          columnId={UNASSIGNED_TEAM_ID}
          title="Unassigned"
          description="Semesters without a team"
          emptyLabel="Drop semesters here"
          items={(optimisticColumns[UNASSIGNED_TEAM_ID] ?? [])
            .map((id) => semestersById.get(id))
            .filter((row): row is ManagerSemesterRow => Boolean(row))}
          canDragCards={canDragCards && sortingEnabled && mounted}
          dragDisabled={isPending || !sortingEnabled || columnDrag !== null}
          columnDraggable={false}
          isCardDropTarget={cardDrag?.targetColumnId === UNASSIGNED_TEAM_ID}
          cardDragState={cardDrag}
          columnRef={(element) => setColumnNode(UNASSIGNED_TEAM_ID, element)}
          listRef={(element) => setListNode(UNASSIGNED_TEAM_ID, element)}
          onCardPointerDown={handleColumnCardPointerDown}
          renderCard={(semester, options) => (
            <PhaseCard
              phase={semester}
              linkToDetail={options.linkToDetail}
              className={options.className}
            />
          )}
        />

        {orderedTeams.map((team, teamIndex) => (
          <div key={team.id} className="contents">
            {columnIndicatorDisplayIndex === teamIndex ? (
              <KanbanColumnDropIndicator />
            ) : null}
            <PointerKanbanColumn
              columnId={team.id}
              title={team.name}
              description="Organizer team"
              emptyLabel="Drop semesters here"
              items={(optimisticColumns[team.id] ?? [])
                .map((id) => semestersById.get(id))
                .filter((row): row is ManagerSemesterRow => Boolean(row))}
              canDragCards={canDragCards && sortingEnabled && mounted}
              dragDisabled={
                isPending || !sortingEnabled || columnDrag !== null
              }
              columnDraggable={canReorderTeams && sortingEnabled && mounted}
              isCardDropTarget={cardDrag?.targetColumnId === team.id}
              isColumnDragging={columnDrag?.draggingColumnId === team.id}
              cardDragState={cardDrag}
              columnRef={(element) => setColumnNode(team.id, element)}
              listRef={(element) => setListNode(team.id, element)}
              onCardPointerDown={handleColumnCardPointerDown}
              onColumnHeaderPointerDown={handleColumnHeaderPointerDown}
              renderCard={(semester, options) => (
                <PhaseCard
                  phase={semester}
                  linkToDetail={options.linkToDetail}
                  className={options.className}
                />
              )}
            />
          </div>
        ))}

        {columnIndicatorDisplayIndex !== null &&
        columnIndicatorDisplayIndex >= orderedTeams.length ? (
          <KanbanColumnDropIndicator />
        ) : null}

        <Can permission={PERMISSIONS.SEMESTERS_TEAMS_CREATE}>
          <button
            type="button"
            onClick={onRequestCreateTeam}
            className={cn(
              "flex w-56 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-10 text-muted-foreground transition-colors",
              "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="Create team"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-dashed border-current">
              <PlusIcon className="size-5" />
            </span>
            <span className="text-sm font-medium">Add team</span>
          </button>
        </Can>
      </KanbanBoardScroll>

      <KanbanDragOverlay
        mounted={mounted}
        active={Boolean(cardDrag && draggingSemester)}
        pointerX={cardDrag?.pointerX ?? 0}
        pointerY={cardDrag?.pointerY ?? 0}
        grabOffsetX={cardDrag?.grabOffsetX ?? 0}
        grabOffsetY={cardDrag?.grabOffsetY ?? 0}
        overlayWidth={cardDrag?.overlayWidth ?? 0}
        className="rotate-[2deg] opacity-95 shadow-2xl"
      >
        {draggingSemester ? (
          <PhaseCard
            phase={draggingSemester}
            linkToDetail={false}
            className="border-primary/40 bg-card"
          />
        ) : null}
      </KanbanDragOverlay>

      <KanbanDragOverlay
        mounted={mounted}
        active={Boolean(columnDrag && draggingTeam)}
        pointerX={columnDrag?.pointerX ?? 0}
        pointerY={columnDrag?.pointerY ?? 0}
        grabOffsetX={columnDrag?.grabOffsetX ?? 0}
        grabOffsetY={columnDrag?.grabOffsetY ?? 0}
        overlayWidth={columnDrag?.overlayWidth ?? 0}
        overlayHeight={columnDrag?.overlayHeight}
        className="flex w-72 flex-col overflow-hidden rounded-xl border border-primary/40 bg-card/95 opacity-95 shadow-2xl rotate-[1.5deg]"
      >
        {draggingTeam ? (
          <>
            <div className="border-b px-3 py-3">
              <div className="flex items-start gap-1.5">
                <GripVerticalIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold tracking-tight">
                    {draggingTeam.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Organizer team
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-3">
              {draggingTeamSemesters.map((semester) => (
                <PhaseCard
                  key={semester.id}
                  phase={semester}
                  linkToDetail={false}
                  className="pointer-events-none"
                />
              ))}
            </div>
          </>
        ) : null}
      </KanbanDragOverlay>
    </>
  );
}
