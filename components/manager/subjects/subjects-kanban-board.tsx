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
import { useFormActionState } from "@/hooks/use-form-action-state";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePointerKanbanBoard } from "@/hooks/use-pointer-kanban-board";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSubjectDetailRoute } from "@/lib/constants/routes";
import { UNASSIGNED_STAGE_ID } from "@/lib/constants/subject-stage";
import { COLUMN_OVERLAY_PREVIEW_CARDS } from "@/lib/kanban/pointer-drag-types";
import {
  applyStageOrder,
  applySubjectBoardColumns,
  buildSubjectBoardColumns,
  type SubjectBoardColumns,
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
  const [columns, setColumns] = useState<SubjectBoardColumns>(() =>
    buildSubjectBoardColumns(subjects, stages)
  );
  const [columnOrder, setColumnOrder] = useState(() =>
    [...stages]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((stage) => stage.id)
  );
  const [prevSubjects, setPrevSubjects] = useState(subjects);
  const [prevStages, setPrevStages] = useState(stages);

  const [optimisticColumns, applyOptimisticColumns] = useOptimistic(
    columns,
    (_current: SubjectBoardColumns, next: SubjectBoardColumns) => next
  );
  const [optimisticColumnOrder, applyOptimisticColumnOrder] = useOptimistic(
    columnOrder,
    (_current: string[], next: string[]) => next
  );

  const columnsRef = useRef(columns);
  const columnOrderRef = useRef(columnOrder);
  const boardRollbackRef = useRef<{
    columns: SubjectBoardColumns;
    subjects: ManagerSubjectRow[];
  } | null>(null);
  const stagesRollbackRef = useRef<{
    order: string[];
    stages: ManagerStageRow[];
  } | null>(null);

  const subjectsById = useMemo(() => {
    const map = new Map<string, ManagerSubjectRow>();
    for (const subject of subjects) {
      map.set(subject.id, subject);
    }
    return map;
  }, [subjects]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    columnOrderRef.current = columnOrder;
  }, [columnOrder]);

  const [isBoardPending, startBoardTransition] = useTransition();
  const [isStagesPending, startStagesTransition] = useTransition();
  const [boardState, boardAction, isBoardActionPending] = useFormActionState(
    saveSubjectBoardAction,
    {} as SaveSubjectBoardActionState
  );
  const [stagesState, stagesAction, isStagesActionPending] = useFormActionState(
    reorderStagesAction,
    {} as ReorderStagesActionState
  );

  const isPending =
    isBoardPending ||
    isStagesPending ||
    isBoardActionPending ||
    isStagesActionPending;

  useActionStateToast(boardState, isBoardPending || isBoardActionPending);
  useActionStateToast(stagesState, isStagesPending || isStagesActionPending);

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
      onSubjectsChange(rollback.subjects);
    },
    (state) => state.success === false
  );

  useActionStateSuccess(
    stagesState,
    isStagesPending || isStagesActionPending,
    (state) => {
      stagesRollbackRef.current = null;
      if (state.stages) {
        onStagesChange(state.stages);
        setColumnOrder(
          [...state.stages]
            .sort((left, right) => left.sort_order - right.sort_order)
            .map((stage) => stage.id)
        );
      }
    }
  );
  useActionStateSuccess(
    stagesState,
    isStagesPending || isStagesActionPending,
    () => {
      const rollback = stagesRollbackRef.current;
      stagesRollbackRef.current = null;
      if (!rollback) {
        return;
      }
      setColumnOrder(rollback.order);
      columnOrderRef.current = rollback.order;
      onStagesChange(rollback.stages);
    },
    (state) => state.success === false
  );

  // Don't rebuild from parent props while a save is in flight — that can
  // clobber optimistic columns before success/rollback settles.
  if (
    !isPending &&
    (subjects !== prevSubjects || stages !== prevStages)
  ) {
    setPrevSubjects(subjects);
    setPrevStages(stages);
    setColumns(buildSubjectBoardColumns(subjects, stages));
    setColumnOrder(
      [...stages]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((stage) => stage.id)
    );
  }

  const persistColumns = useCallback(
    (nextColumns: SubjectBoardColumns) => {
      const nextSubjects = applySubjectBoardColumns(subjects, nextColumns);
      boardRollbackRef.current = {
        columns: columnsRef.current,
        subjects,
      };

      const formData = new FormData();
      formData.set("columns", JSON.stringify(nextColumns));

      startBoardTransition(() => {
        applyOptimisticColumns(nextColumns);
        setColumns(nextColumns);
        columnsRef.current = nextColumns;
        onSubjectsChange(nextSubjects);
        boardAction(formData);
      });
    },
    [
      subjects,
      onSubjectsChange,
      boardAction,
      startBoardTransition,
      applyOptimisticColumns,
    ]
  );

  const persistStageOrder = useCallback(
    (orderedIds: string[]) => {
      const nextStages = applyStageOrder(stages, orderedIds);
      stagesRollbackRef.current = {
        order: columnOrderRef.current,
        stages,
      };

      const formData = new FormData();
      formData.set("ordered_ids", JSON.stringify(orderedIds));

      startStagesTransition(() => {
        applyOptimisticColumnOrder(orderedIds);
        setColumnOrder(orderedIds);
        columnOrderRef.current = orderedIds;
        onStagesChange(nextStages);
        stagesAction(formData);
      });
    },
    [
      stages,
      onStagesChange,
      stagesAction,
      startStagesTransition,
      applyOptimisticColumnOrder,
    ]
  );

  const onCardActivate = useCallback(
    (cardId: string) => {
      router.push(getManagerSubjectDetailRoute(cardId));
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
    canReorderColumns,
    sortingEnabled,
    isPending,
    onPersistColumns: persistColumns,
    onPersistColumnOrder: persistStageOrder,
    onCardActivate,
  });

  useEffect(() => {
    refreshOverflow();
  }, [
    optimisticColumns,
    optimisticColumnOrder,
    stages.length,
    subjects.length,
    refreshOverflow,
  ]);

  const handleColumnCardPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      subject: ManagerSubjectRow,
      columnId: string,
      index: number
    ) => {
      handleCardPointerDown(event, subject.id, columnId, index);
    },
    [handleCardPointerDown]
  );

  if (subjects.length === 0 && stages.length === 0) {
    return (
      <EmptyState
        icon={LayersIcon}
        title="No subjects yet"
        description="Create a subject or stage to get started."
      />
    );
  }

  const orderedStages = optimisticColumnOrder
    .map((id) => stages.find((stage) => stage.id === id))
    .filter((stage): stage is ManagerStageRow => Boolean(stage));

  const draggingSubject = cardDrag
    ? subjectsById.get(cardDrag.draggingCardId)
    : null;

  const draggingStage = columnDrag
    ? stages.find((stage) => stage.id === columnDrag.draggingColumnId)
    : null;
  const draggingStageSubjects = columnDrag
    ? (optimisticColumns[columnDrag.draggingColumnId] ?? [])
        .map((id) => subjectsById.get(id))
        .filter((row): row is ManagerSubjectRow => Boolean(row))
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
          columnId={UNASSIGNED_STAGE_ID}
          title="Unassigned"
          description="Subjects without a stage"
          emptyLabel="Drop subjects here"
          items={(optimisticColumns[UNASSIGNED_STAGE_ID] ?? [])
            .map((id) => subjectsById.get(id))
            .filter((row): row is ManagerSubjectRow => Boolean(row))}
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
              items={(optimisticColumns[stage.id] ?? [])
                .map((id) => subjectsById.get(id))
                .filter((row): row is ManagerSubjectRow => Boolean(row))}
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
