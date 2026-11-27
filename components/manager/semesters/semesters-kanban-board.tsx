"use client";

import { useCallback } from "react";
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
import { SemesterCard } from "@/components/manager/semesters/semester-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useOptimisticKanbanBoard } from "@/hooks/use-optimistic-kanban-board";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSemesterDetailRoute } from "@/lib/constants/routes";
import { UNASSIGNED_TEAM_ID } from "@/lib/constants/semester-team";
import { COLUMN_OVERLAY_PREVIEW_CARDS } from "@/lib/kanban/pointer-drag-types";
import {
  applyTeamOrder,
  applySemesterBoardColumns,
  buildSemesterBoardColumns,
} from "@/lib/semesters/semester-board-state";
import { cn } from "@/lib/utils";
import type {
  ManagerSemesterTeamRow,
  ReorderSemesterTeamsActionState,
  SaveSemesterBoardActionState,
} from "@/types/manager-semester-team";
import type { ManagerSemesterRow } from "@/types/manager-semester";

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

  const onCardActivate = useCallback(
    (cardId: string) => {
      router.push(getManagerSemesterDetailRoute(cardId));
    },
    [router]
  );

  const {
    isPending,
    mounted,
    itemsById: semestersById,
    orderedGroups: orderedTeams,
    cardDrag,
    columnDrag,
    columnIndicatorDisplayIndex,
    isBoardDragging,
    boardScrollRef,
    canPan,
    isPanning,
    scrollProps,
    setColumnNode,
    setListNode,
    handleColumnHeaderPointerDown,
    handleColumnCardPointerDown,
    getColumnItems,
  } = useOptimisticKanbanBoard<
    ManagerSemesterRow,
    ManagerSemesterTeamRow,
    SaveSemesterBoardActionState,
    ReorderSemesterTeamsActionState
  >({
    items: semesters,
    groups: teams,
    canDragCards,
    canReorderColumns: canReorderTeams,
    sortingEnabled,
    onItemsChange: onSemestersChange,
    onGroupsChange: onTeamsChange,
    buildColumns: buildSemesterBoardColumns,
    applyItemColumns: applySemesterBoardColumns,
    applyGroupOrder: applyTeamOrder,
    saveBoardAction: saveSemesterBoardAction,
    reorderGroupsAction: reorderSemesterTeamsAction,
    getGroupsFromReorderState: (state) => state.teams,
    onCardActivate,
  });

  if (semesters.length === 0 && teams.length === 0) {
    return (
      <EmptyState
        icon={LayersIcon}
        title="No semesters yet"
        description="Create a semester or team to get started."
      />
    );
  }

  const draggingSemester = cardDrag
    ? (semestersById.get(cardDrag.draggingCardId) ?? null)
    : null;

  const draggingTeam = columnDrag
    ? teams.find((team) => team.id === columnDrag.draggingColumnId)
    : null;
  const draggingTeamSemesters = columnDrag
    ? getColumnItems(columnDrag.draggingColumnId).slice(
        0,
        COLUMN_OVERLAY_PREVIEW_CARDS
      )
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
          items={getColumnItems(UNASSIGNED_TEAM_ID)}
          canDragCards={canDragCards && sortingEnabled && mounted}
          dragDisabled={isPending || !sortingEnabled || columnDrag !== null}
          columnDraggable={false}
          isCardDropTarget={cardDrag?.targetColumnId === UNASSIGNED_TEAM_ID}
          cardDragState={cardDrag}
          columnRef={(element) => setColumnNode(UNASSIGNED_TEAM_ID, element)}
          listRef={(element) => setListNode(UNASSIGNED_TEAM_ID, element)}
          onCardPointerDown={handleColumnCardPointerDown}
          renderCard={(semester, options) => (
            <SemesterCard
              semester={semester}
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
              items={getColumnItems(team.id)}
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
                <SemesterCard
                  semester={semester}
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
          <SemesterCard
            semester={draggingSemester}
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
                <SemesterCard
                  key={semester.id}
                  semester={semester}
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
