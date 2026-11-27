"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  reorderSemesterTeamsAction,
  saveSemesterBoardAction,
} from "@/app/manager/semesters/actions";
import { PointerKanbanBoardView } from "@/components/manager/kanban/pointer-kanban-board-view";
import { SemesterCard } from "@/components/manager/semesters/semester-card";
import { useOptimisticKanbanBoard } from "@/hooks/use-optimistic-kanban-board";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSemesterDetailRoute } from "@/lib/constants/routes";
import { UNASSIGNED_TEAM_ID } from "@/lib/constants/semester-team";
import {
  applyTeamOrder,
  applySemesterBoardColumns,
  buildSemesterBoardColumns,
} from "@/lib/semesters/semester-board-state";
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

  const board = useOptimisticKanbanBoard<
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

  return (
    <PointerKanbanBoardView
      isEmpty={semesters.length === 0 && teams.length === 0}
      emptyTitle="No semesters yet"
      emptyDescription="Create a semester or team to get started."
      isFilterEmpty={
        !sortingEnabled && semesters.length === 0 && teams.length > 0
      }
      filterEmptyTitle="No matching semesters"
      filterEmptyDescription="Clear search to drag columns and reorder cards."
      board={board}
      canDragCards={canDragCards}
      canReorderColumns={canReorderTeams}
      sortingEnabled={sortingEnabled}
      unassignedId={UNASSIGNED_TEAM_ID}
      unassignedDescription="Semesters without a team"
      unassignedEmptyLabel="Drop semesters here"
      groupEmptyLabel="Drop semesters here"
      getGroupDescription={() => "Organizer team"}
      createPermission={PERMISSIONS.SEMESTERS_TEAMS_CREATE}
      createLabel="Add team"
      createAriaLabel="Create team"
      onRequestCreate={onRequestCreateTeam}
      renderCard={(semester, options) => (
        <SemesterCard
          semester={semester}
          linkToDetail={options.linkToDetail}
          className={options.className}
        />
      )}
    />
  );
}
