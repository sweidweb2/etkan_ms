"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  reorderStagesAction,
  saveSubjectBoardAction,
} from "@/app/manager/subjects/actions";
import { PointerKanbanBoardView } from "@/components/manager/kanban/pointer-kanban-board-view";
import { SubjectCard } from "@/components/manager/subjects/subject-card";
import { useOptimisticKanbanBoard } from "@/hooks/use-optimistic-kanban-board";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSubjectDetailRoute } from "@/lib/constants/routes";
import { UNASSIGNED_STAGE_ID } from "@/lib/constants/subject-stage";
import {
  applyStageOrder,
  applySubjectBoardColumns,
  buildSubjectBoardColumns,
} from "@/lib/subjects/subject-board-state";
import type {
  ManagerStageRow,
  ReorderStagesActionState,
  SaveSubjectBoardActionState,
} from "@/types/manager-stage";
import type { ManagerSubjectRow } from "@/types/manager-subject";

type SubjectsKanbanBoardProps = {
  subjects: ManagerSubjectRow[];
  stages: ManagerStageRow[];
  canDragCards: boolean;
  canReorderColumns: boolean;
  sortingEnabled: boolean;
  onSubjectsChange: (subjects: ManagerSubjectRow[]) => void;
  onStagesChange: (stages: ManagerStageRow[]) => void;
  onRequestCreateStage: () => void;
};

export function SubjectsKanbanBoard({
  subjects,
  stages,
  canDragCards,
  canReorderColumns,
  sortingEnabled,
  onSubjectsChange,
  onStagesChange,
  onRequestCreateStage,
}: SubjectsKanbanBoardProps) {
  const router = useRouter();

  const onCardActivate = useCallback(
    (cardId: string) => {
      router.push(getManagerSubjectDetailRoute(cardId));
    },
    [router]
  );

  const board = useOptimisticKanbanBoard<
    ManagerSubjectRow,
    ManagerStageRow,
    SaveSubjectBoardActionState,
    ReorderStagesActionState
  >({
    items: subjects,
    groups: stages,
    canDragCards,
    canReorderColumns,
    sortingEnabled,
    onItemsChange: onSubjectsChange,
    onGroupsChange: onStagesChange,
    buildColumns: buildSubjectBoardColumns,
    applyItemColumns: applySubjectBoardColumns,
    applyGroupOrder: applyStageOrder,
    saveBoardAction: saveSubjectBoardAction,
    reorderGroupsAction: reorderStagesAction,
    getGroupsFromReorderState: (state) => state.stages,
    onCardActivate,
  });

  return (
    <PointerKanbanBoardView
      isEmpty={subjects.length === 0 && stages.length === 0}
      emptyTitle="No subjects yet"
      emptyDescription="Create a subject or stage to get started."
      board={board}
      canDragCards={canDragCards}
      canReorderColumns={canReorderColumns}
      sortingEnabled={sortingEnabled}
      unassignedId={UNASSIGNED_STAGE_ID}
      unassignedDescription="Subjects without a stage"
      unassignedEmptyLabel="Drop subjects here"
      groupEmptyLabel="Drop subjects here"
      getGroupDescription={(stage) =>
        `Level ${stage.level} · Period ${stage.period}`
      }
      createPermission={PERMISSIONS.SUBJECTS_STAGES_CREATE}
      createLabel="Add stage"
      createAriaLabel="Create stage"
      onRequestCreate={onRequestCreateStage}
      renderCard={(subject, options) => (
        <SubjectCard
          subject={subject}
          linkToDetail={options.linkToDetail}
          className={options.className}
        />
      )}
    />
  );
}
