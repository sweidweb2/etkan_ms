"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { GripVerticalIcon, LayersIcon, PlusIcon } from "lucide-react";
import {
  reorderStagesAction,
  saveSubjectBoardAction,
} from "@/app/manager/subjects/actions";
import { Can } from "@/components/auth/can";
import { KanbanBoardScroll } from "@/components/manager/kanban/kanban-board-scroll";
import { KanbanColumnDropIndicator } from "@/components/manager/kanban/kanban-drop-indicators";
import { KanbanDragOverlay } from "@/components/manager/kanban/kanban-drag-overlay";
import { PointerKanbanColumn } from "@/components/manager/kanban/pointer-kanban-column";
import { SubjectCard } from "@/components/manager/subjects/subject-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useOptimisticKanbanBoard } from "@/hooks/use-optimistic-kanban-board";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSubjectDetailRoute } from "@/lib/constants/routes";
import { UNASSIGNED_STAGE_ID } from "@/lib/constants/subject-stage";
import { COLUMN_OVERLAY_PREVIEW_CARDS } from "@/lib/kanban/pointer-drag-types";
import {
  applyStageOrder,
  applySubjectBoardColumns,
  buildSubjectBoardColumns,
} from "@/lib/subjects/subject-board-state";
import { cn } from "@/lib/utils";
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

  const {
    isPending,
    mounted,
    itemsById: subjectsById,
    orderedGroups: orderedStages,
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

  if (subjects.length === 0 && stages.length === 0) {
    return (
      <EmptyState
        icon={LayersIcon}
        title="No subjects yet"
        description="Create a subject or stage to get started."
      />
    );
  }

  const draggingSubject = cardDrag
    ? (subjectsById.get(cardDrag.draggingCardId) ?? null)
    : null;

  const draggingStage = columnDrag
    ? stages.find((stage) => stage.id === columnDrag.draggingColumnId)
    : null;
  const draggingStageSubjects = columnDrag
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
          columnId={UNASSIGNED_STAGE_ID}
          title="Unassigned"
          description="Subjects without a stage"
          emptyLabel="Drop subjects here"
          items={getColumnItems(UNASSIGNED_STAGE_ID)}
          canDragCards={canDragCards && sortingEnabled && mounted}
          dragDisabled={isPending || !sortingEnabled || columnDrag !== null}
          columnDraggable={false}
          isCardDropTarget={cardDrag?.targetColumnId === UNASSIGNED_STAGE_ID}
          cardDragState={cardDrag}
          columnRef={(element) => setColumnNode(UNASSIGNED_STAGE_ID, element)}
          listRef={(element) => setListNode(UNASSIGNED_STAGE_ID, element)}
          onCardPointerDown={handleColumnCardPointerDown}
          renderCard={(subject, options) => (
            <SubjectCard
              subject={subject}
              linkToDetail={options.linkToDetail}
              className={options.className}
            />
          )}
        />

        {orderedStages.map((stage, stageIndex) => (
          <div key={stage.id} className="contents">
            {columnIndicatorDisplayIndex === stageIndex ? (
              <KanbanColumnDropIndicator />
            ) : null}
            <PointerKanbanColumn
              columnId={stage.id}
              title={stage.name}
              description={`Level ${stage.level} · Period ${stage.period}`}
              emptyLabel="Drop subjects here"
              items={getColumnItems(stage.id)}
              canDragCards={canDragCards && sortingEnabled && mounted}
              dragDisabled={
                isPending || !sortingEnabled || columnDrag !== null
              }
              columnDraggable={canReorderColumns && sortingEnabled && mounted}
              isCardDropTarget={cardDrag?.targetColumnId === stage.id}
              isColumnDragging={columnDrag?.draggingColumnId === stage.id}
              cardDragState={cardDrag}
              columnRef={(element) => setColumnNode(stage.id, element)}
              listRef={(element) => setListNode(stage.id, element)}
              onCardPointerDown={handleColumnCardPointerDown}
              onColumnHeaderPointerDown={handleColumnHeaderPointerDown}
              renderCard={(subject, options) => (
                <SubjectCard
                  subject={subject}
                  linkToDetail={options.linkToDetail}
                  className={options.className}
                />
              )}
            />
          </div>
        ))}

        {columnIndicatorDisplayIndex !== null &&
        columnIndicatorDisplayIndex >= orderedStages.length ? (
          <KanbanColumnDropIndicator />
        ) : null}

        <Can permission={PERMISSIONS.SUBJECTS_STAGES_CREATE}>
          <button
            type="button"
            onClick={onRequestCreateStage}
            className={cn(
              "flex w-56 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-10 text-muted-foreground transition-colors",
              "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="Create stage"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-dashed border-current">
              <PlusIcon className="size-5" />
            </span>
            <span className="text-sm font-medium">Add stage</span>
          </button>
        </Can>
      </KanbanBoardScroll>

      <KanbanDragOverlay
        mounted={mounted}
        active={Boolean(cardDrag && draggingSubject)}
        pointerX={cardDrag?.pointerX ?? 0}
        pointerY={cardDrag?.pointerY ?? 0}
        grabOffsetX={cardDrag?.grabOffsetX ?? 0}
        grabOffsetY={cardDrag?.grabOffsetY ?? 0}
        overlayWidth={cardDrag?.overlayWidth ?? 0}
        className="rotate-[2deg] opacity-95 shadow-2xl"
      >
        {draggingSubject ? (
          <SubjectCard
            subject={draggingSubject}
            linkToDetail={false}
            className="border-primary/40 bg-card"
          />
        ) : null}
      </KanbanDragOverlay>

      <KanbanDragOverlay
        mounted={mounted}
        active={Boolean(columnDrag && draggingStage)}
        pointerX={columnDrag?.pointerX ?? 0}
        pointerY={columnDrag?.pointerY ?? 0}
        grabOffsetX={columnDrag?.grabOffsetX ?? 0}
        grabOffsetY={columnDrag?.grabOffsetY ?? 0}
        overlayWidth={columnDrag?.overlayWidth ?? 0}
        overlayHeight={columnDrag?.overlayHeight}
        className="flex w-72 flex-col overflow-hidden rounded-xl border border-primary/40 bg-card/95 opacity-95 shadow-2xl rotate-[1.5deg]"
      >
        {draggingStage ? (
          <>
            <div className="border-b px-3 py-3">
              <div className="flex items-start gap-1.5">
                <GripVerticalIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold tracking-tight">
                    {draggingStage.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Level {draggingStage.level} · Period {draggingStage.period}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-3">
              {draggingStageSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
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
