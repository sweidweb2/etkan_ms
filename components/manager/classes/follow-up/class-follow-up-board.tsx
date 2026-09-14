"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  DragDropProvider,
  useDragDropManager,
  type DragEndEvent,
} from "@dnd-kit/react";
import { saveClassFollowUpAction } from "@/app/manager/classes/[id]/categories/actions";
import { Can } from "@/components/auth/can";
import { CategoryChip } from "@/components/manager/classes/follow-up/category-chip";
import { ClassCategoryDraggableChip } from "@/components/manager/classes/follow-up/class-category-draggable-chip";
import { ClassCategoryDropZone } from "@/components/manager/classes/follow-up/class-category-drop-zone";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import {
  getCategoryById,
  getDirectChildren,
  getRootCategories,
  getRootParentId,
} from "@/lib/classes/category-tree";
import { buildParentGroupToneMaps } from "@/lib/classes/parent-group-colors";
import {
  getAssignedCategoryIds,
  getCategoryContainer,
  isFollowUpDirty,
  moveCategoryBetweenContainers,
  type FollowUpBoardState,
  type FollowUpContainer,
} from "@/lib/classes/follow-up-state";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { ManagerCategoryRow } from "@/types/manager-category";
import type { SaveClassFollowUpActionState } from "@/types/manager-class-follow-up";

const emptySubscribe = () => () => {};

function useHasMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const CONTAINERS: readonly FollowUpContainer[] = [
  "pool",
  "in_progress",
  "done",
];

function FollowUpDragMonitor({
  enabled,
  onDragEnd,
}: {
  enabled: boolean;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const manager = useDragDropManager();
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  useEffect(() => {
    if (!manager || !enabled) {
      return;
    }

    return manager.monitor.addEventListener("dragend", (event) => {
      onDragEndRef.current(event as DragEndEvent);
    });
  }, [manager, enabled]);

  return null;
}

type ClassFollowUpBoardProps = {
  classId: string;
  categories: ManagerCategoryRow[];
  initialBoard: FollowUpBoardState;
};

export function ClassFollowUpBoard({
  classId,
  categories,
  initialBoard,
}: ClassFollowUpBoardProps) {
  const router = useRouter();
  const mounted = useHasMounted();
  const [savedBoard, setSavedBoard] = useState(initialBoard);
  const [draftBoard, setDraftBoard] = useState(initialBoard);
  const [prevInitial, setPrevInitial] = useState(initialBoard);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [doneParentTab, setDoneParentTab] = useState<string | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [saveState, saveAction, isSavePending] = useActionState(
    saveClassFollowUpAction,
    {} as SaveClassFollowUpActionState
  );
  const isPending = isSavePending || isTransitionPending;
  const draftBoardRef = useRef(draftBoard);

  useActionStateToast(saveState, isPending);

  if (initialBoard !== prevInitial) {
    setPrevInitial(initialBoard);
    setSavedBoard(initialBoard);
    setDraftBoard(initialBoard);
  }

  draftBoardRef.current = draftBoard;

  useActionStateSuccess(saveState, isPending, () => {
    setSavedBoard(draftBoardRef.current);
    router.refresh();
  });

  const tones = useMemo(
    () => buildParentGroupToneMaps(categories),
    [categories]
  );
  const roots = useMemo(() => getRootCategories(categories), [categories]);
  const assigned = useMemo(
    () => getAssignedCategoryIds(draftBoard),
    [draftBoard]
  );
  const dirty = isFollowUpDirty(draftBoard, savedBoard);

  const activeRootId = selectedRootId ?? roots[0]?.id ?? null;
  const poolBrowseCategories = useMemo(() => {
    if (!activeRootId) {
      return [] as ManagerCategoryRow[];
    }
    const parent = getCategoryById(categories, activeRootId);
    const children = getDirectChildren(categories, activeRootId);
    return parent ? [parent, ...children] : children;
  }, [activeRootId, categories]);

  const doneParents = useMemo(() => {
    const parentIds = new Set<string>();
    for (const id of draftBoard.doneCategoryIds) {
      parentIds.add(getRootParentId(categories, id));
    }
    return roots.filter((root) => parentIds.has(root.id));
  }, [categories, draftBoard.doneCategoryIds, roots]);

  const activeDoneParentId = doneParentTab ?? doneParents[0]?.id ?? null;

  const doneVisibleIds = useMemo(() => {
    if (!activeDoneParentId) {
      return draftBoard.doneCategoryIds;
    }
    const inTab = draftBoard.doneCategoryIds.filter(
      (id) => getRootParentId(categories, id) === activeDoneParentId
    );
    return inTab;
  }, [activeDoneParentId, categories, draftBoard.doneCategoryIds]);

  const doneOrphanIds = useMemo(() => {
    if (doneParents.length === 0) {
      return draftBoard.doneCategoryIds;
    }
    const covered = new Set(
      draftBoard.doneCategoryIds.filter((id) =>
        doneParents.some(
          (parent) => getRootParentId(categories, id) === parent.id
        )
      )
    );
    return draftBoard.doneCategoryIds.filter((id) => !covered.has(id));
  }, [categories, doneParents, draftBoard.doneCategoryIds]);

  function resolveDropContainer(
    operation: DragEndEvent["operation"]
  ): FollowUpContainer | null {
    const { source, target } = operation;
    if (!source) {
      return null;
    }

    const resolve = (entityId: string): FollowUpContainer | null => {
      if ((CONTAINERS as readonly string[]).includes(entityId)) {
        return entityId as FollowUpContainer;
      }
      return getCategoryContainer(draftBoard, entityId);
    };

    if (target) {
      const fromTarget = resolve(String(target.id));
      if (fromTarget) {
        return fromTarget;
      }
    }

    return null;
  }

  function handleDragEnd(event: DragEndEvent) {
    const sourceId = event.operation.source
      ? String(event.operation.source.id)
      : null;
    if (!sourceId) {
      return;
    }

    const from = getCategoryContainer(draftBoard, sourceId);
    const to = resolveDropContainer(event.operation);
    if (!to || from === to) {
      return;
    }

    setDraftBoard((prev) =>
      moveCategoryBetweenContainers(prev, sourceId, from, to)
    );
  }

  function handleSave() {
    const formData = new FormData();
    formData.set("class_id", classId);
    for (const id of draftBoard.inProgressCategoryIds) {
      formData.append("in_progress_category_ids", id);
    }
    for (const id of draftBoard.doneCategoryIds) {
      formData.append("done_category_ids", id);
    }
    startTransition(() => {
      saveAction(formData);
    });
  }

  const boardBody = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Category follow-up
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag topics between columns. Changes save only when you click Save.
          </p>
        </div>
        <Can permission={PERMISSIONS.CLASSES_UPDATE}>
          <Button
            type="button"
            disabled={!dirty || isPending}
            onClick={handleSave}
          >
            {isPending ? <InlineSpinner /> : null}
            Save follow-up
          </Button>
        </Can>
      </div>

      <ClassCategoryDropZone
        id="pool"
        title="Not taken"
        description="Browse by parent. Assigned topics stay visible but locked."
        headerExtra={
          roots.length > 0 ? (
            <div className="flex max-w-full flex-wrap gap-1.5">
              {roots.map((root) => (
                <CategoryChip
                  key={root.id}
                  label={root.name}
                  selected={activeRootId === root.id}
                  tone={tones.byRootId.get(root.id)}
                  onClick={() => setSelectedRootId(root.id)}
                />
              ))}
            </div>
          ) : null
        }
      >
        {poolBrowseCategories.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {categories.length === 0
              ? "No categories in the catalog yet."
              : "Select a parent category to browse."}
          </p>
        ) : (
          poolBrowseCategories.map((category) => {
            const container = getCategoryContainer(draftBoard, category.id);
            const isAssigned = assigned.has(category.id);
            return (
              <ClassCategoryDraggableChip
                key={category.id}
                id={category.id}
                label={category.name}
                tone={tones.byCategoryId.get(category.id)}
                locked={isAssigned}
                lockedIn={
                  isAssigned && container !== "pool" ? container : undefined
                }
                staticOnly={!mounted || isAssigned}
                disabled={isPending}
              />
            );
          })
        )}
      </ClassCategoryDropZone>

      <ClassCategoryDropZone
        id="in_progress"
        title="In progress"
        description="Next topics to teach."
      >
        {draftBoard.inProgressCategoryIds.length === 0 ? (
          <p className="text-xs text-muted-foreground">Drop topics here.</p>
        ) : (
          draftBoard.inProgressCategoryIds.map((id) => {
            const category = getCategoryById(categories, id);
            if (!category) {
              return null;
            }
            return (
              <ClassCategoryDraggableChip
                key={id}
                id={id}
                label={category.name}
                tone={tones.byCategoryId.get(id)}
                staticOnly={!mounted}
                disabled={isPending}
              />
            );
          })
        )}
      </ClassCategoryDropZone>

      <ClassCategoryDropZone
        id="done"
        title="Done"
        description="Already taught."
        headerExtra={
          doneParents.length > 0 ? (
            <div className="flex max-w-full flex-wrap gap-1.5">
              {doneParents.map((parent) => (
                <CategoryChip
                  key={parent.id}
                  label={parent.name}
                  selected={activeDoneParentId === parent.id}
                  tone={tones.byRootId.get(parent.id)}
                  onClick={() => setDoneParentTab(parent.id)}
                />
              ))}
            </div>
          ) : null
        }
      >
        {draftBoard.doneCategoryIds.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No completed topics yet.
          </p>
        ) : (
          <>
            {doneVisibleIds.map((id) => {
              const category = getCategoryById(categories, id);
              if (!category) {
                return null;
              }
              return (
                <ClassCategoryDraggableChip
                  key={id}
                  id={id}
                  label={category.name}
                  tone={tones.byCategoryId.get(id)}
                  staticOnly={!mounted}
                  disabled={isPending}
                />
              );
            })}
            {doneOrphanIds.length > 0 && doneParents.length > 0 ? (
              <div className="basis-full pt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Other
              </div>
            ) : null}
            {doneParents.length > 0
              ? doneOrphanIds.map((id) => {
                  const category = getCategoryById(categories, id);
                  if (!category) {
                    return null;
                  }
                  return (
                    <ClassCategoryDraggableChip
                      key={`orphan-${id}`}
                      id={id}
                      label={category.name}
                      tone={tones.byCategoryId.get(id)}
                      staticOnly={!mounted}
                      disabled={isPending}
                    />
                  );
                })
              : null}
          </>
        )}
      </ClassCategoryDropZone>
    </div>
  );

  if (!mounted) {
    return boardBody;
  }

  return (
    <DragDropProvider>
      <FollowUpDragMonitor enabled={!isPending} onDragEnd={handleDragEnd} />
      {boardBody}
    </DragDropProvider>
  );
}
