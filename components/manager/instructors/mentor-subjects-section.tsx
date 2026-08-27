"use client";

import {
  useActionState,
  useMemo,
  useState,
  useTransition,
} from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import {
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import {
  deleteMentorSubjectAction,
  saveMentorSubjectOrderAction,
} from "@/app/manager/instructors/actions";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { AddMentorSubjectDialog } from "@/components/manager/instructors/add-mentor-subject-dialog";
import { EditMentorSubjectDialog } from "@/components/manager/instructors/edit-mentor-subject-dialog";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import type {
  DeleteMentorSubjectActionState,
  ManagerMentorSubjectColumn,
  SaveMentorSubjectOrderActionState,
} from "@/types/manager-instructor";

const initialDeleteState: DeleteMentorSubjectActionState = {};
const initialOrderState: SaveMentorSubjectOrderActionState = {};

type MentorSubjectsSectionProps = {
  mentorSubjects: ManagerMentorSubjectColumn[];
  onMentorSubjectsChange: (subjects: ManagerMentorSubjectColumn[]) => void;
  onMentorSubjectDeleted: (mentorSubjectId: string) => void;
  busy?: boolean;
};

function orderKey(subjects: ManagerMentorSubjectColumn[]) {
  return subjects.map((row) => row.id).join("|");
}

function uniqueById(subjects: ManagerMentorSubjectColumn[]) {
  const seen = new Set<string>();
  const unique: ManagerMentorSubjectColumn[] = [];
  for (const row of subjects) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    unique.push(row);
  }
  return unique;
}

function SortableMentorSubjectRow({
  subject,
  index,
  disabled,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  subject: ManagerMentorSubjectColumn;
  index: number;
  disabled: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: subject.id,
    index,
    disabled,
  });

  return (
    <li
      ref={ref}
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-2 rounded-lg border bg-background px-3 py-2",
        isDragging && "opacity-80 shadow-sm"
      )}
    >
      {canUpdate ? (
        <button
          type="button"
          ref={handleRef}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground",
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-grab active:cursor-grabbing hover:bg-muted"
          )}
          aria-label={`Reorder ${subject.name}`}
          disabled={disabled}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      ) : null}

      <span
        className="w-6 shrink-0 text-center text-sm tabular-nums text-muted-foreground"
        aria-label={`Order ${index + 1}`}
      >
        {index + 1}
      </span>

      <span className="max-w-[16rem] truncate font-medium">{subject.name}</span>

      <div className="flex shrink-0 items-center gap-1">
        {canUpdate ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={onEdit}
            aria-label={`Edit ${subject.name}`}
          >
            <PencilIcon />
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={onDelete}
            aria-label={`Delete ${subject.name}`}
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function MentorSubjectsSection({
  mentorSubjects,
  onMentorSubjectsChange,
  onMentorSubjectDeleted,
  busy = false,
}: MentorSubjectsSectionProps) {
  const permissions = usePermissions();
  const canCreate = hasPermissionInSet(
    permissions,
    PERMISSIONS.INSTRUCTORS_MENTOR_SUBJECTS_CREATE
  );
  const canUpdate = hasPermissionInSet(
    permissions,
    PERMISSIONS.INSTRUCTORS_MENTOR_SUBJECTS_UPDATE
  );
  const canDelete = hasPermissionInSet(
    permissions,
    PERMISSIONS.INSTRUCTORS_MENTOR_SUBJECTS_DELETE
  );

  const [draftSubjects, setDraftSubjects] = useState(mentorSubjects);
  const subjectsSyncKey = orderKey(mentorSubjects);
  const [syncedKey, setSyncedKey] = useState(subjectsSyncKey);

  if (subjectsSyncKey !== syncedKey) {
    setSyncedKey(subjectsSyncKey);
    setDraftSubjects(uniqueById(mentorSubjects));
  }

  const [baselineKey, setBaselineKey] = useState(subjectsSyncKey);
  const isOrderDirty = orderKey(draftSubjects) !== baselineKey;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagerMentorSubjectColumn | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] =
    useState<ManagerMentorSubjectColumn | null>(null);

  const [isOrderTransitionPending, startOrderTransition] = useTransition();
  const [orderState, orderFormAction, isOrderActionPending] = useActionState(
    saveMentorSubjectOrderAction,
    initialOrderState
  );
  const isOrderPending = isOrderActionPending || isOrderTransitionPending;

  const [isDeleteTransitionPending, startDeleteTransition] = useTransition();
  const [deleteState, deleteFormAction, isDeleteActionPending] = useActionState(
    deleteMentorSubjectAction,
    initialDeleteState
  );
  const isDeletePending = isDeleteActionPending || isDeleteTransitionPending;

  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeletePending,
    (open) => {
      if (!open) {
        setDeleteTarget(null);
      }
    }
  );

  useActionStateToast(orderState, isOrderPending);
  useActionStateToast(deleteState, isDeletePending);

  useActionStateSuccess(orderState, isOrderPending, (nextState) => {
    if (!nextState.mentorSubjects) {
      return;
    }
    onMentorSubjectsChange(nextState.mentorSubjects);
    setDraftSubjects(nextState.mentorSubjects);
    setBaselineKey(orderKey(nextState.mentorSubjects));
  });

  useActionStateSuccess(deleteState, isDeletePending, (nextState) => {
    if (!nextState.mentorSubjectId) {
      return;
    }
    const next = draftSubjects.filter(
      (row) => row.id !== nextState.mentorSubjectId
    );
    setDraftSubjects(next);
    setBaselineKey(orderKey(next));
    onMentorSubjectsChange(next);
    onMentorSubjectDeleted(nextState.mentorSubjectId);
    setDeleteTarget(null);
  });

  const sectionBusy = busy || isOrderPending || isDeletePending;

  const sortedDraft = useMemo(
    () =>
      uniqueById(draftSubjects).map((row, index) => ({
        ...row,
        sort_order: index,
      })),
    [draftSubjects]
  );

  function handleSaveOrder() {
    const formData = new FormData();
    formData.set(
      "orderedIds",
      JSON.stringify(draftSubjects.map((row) => row.id))
    );
    startOrderTransition(() => {
      orderFormAction(formData);
    });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }
    const formData = new FormData();
    formData.set("id", deleteTarget.id);
    startDeleteTransition(() => {
      deleteFormAction(formData);
    });
  }

  return (
    <Card className="py-0">
      <CardHeader className="border-b bg-muted/40 py-3">
        <CardTitle>Mentor subjects</CardTitle>
        <CardAction>
          <div className="flex flex-wrap items-center gap-2">
            <Can permission={PERMISSIONS.INSTRUCTORS_MENTOR_SUBJECTS_UPDATE}>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                disabled={
                  !isOrderDirty || sectionBusy || draftSubjects.length === 0
                }
                onClick={handleSaveOrder}
              >
                {isOrderPending ? (
                  <>
                    <InlineSpinner className="mr-2" />
                    Saving order…
                  </>
                ) : (
                  "Save order"
                )}
              </Button>
            </Can>
            <Can permission={PERMISSIONS.INSTRUCTORS_MENTOR_SUBJECTS_CREATE}>
              <Button
                type="button"
                className="shrink-0"
                disabled={sectionBusy}
                onClick={() => setIsAddOpen(true)}
              >
                <PlusIcon data-icon="inline-start" />
                Add mentor subject
              </Button>
            </Can>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="py-4">
        {draftSubjects.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            {canCreate
              ? "Create a mentor subject to build the capability matrix."
              : "No mentor subjects yet."}
          </div>
        ) : (
          <DragDropProvider
            onDragEnd={(event) => {
              if (event.canceled || !canUpdate || sectionBusy) {
                return;
              }
              const { source } = event.operation;
              if (!isSortable(source)) {
                return;
              }
              const { initialIndex, index } = source;
              if (initialIndex === index) {
                return;
              }
              setDraftSubjects((current) => {
                const next = [...current];
                const [removed] = next.splice(initialIndex, 1);
                if (!removed) {
                  return current;
                }
                next.splice(index, 0, removed);
                return next;
              });
            }}
          >
            <ul className="flex flex-wrap items-start gap-2">
              {sortedDraft.map((subject, index) => (
                <SortableMentorSubjectRow
                  key={subject.id}
                  subject={subject}
                  index={index}
                  disabled={sectionBusy || !canUpdate}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={() => setEditTarget(subject)}
                  onDelete={() => setDeleteTarget(subject)}
                />
              ))}
            </ul>
          </DragDropProvider>
        )}
      </CardContent>

      <AddMentorSubjectDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onCreated={(created) => {
          const next = uniqueById([...draftSubjects, created]);
          setDraftSubjects(next);
          setBaselineKey(orderKey(next));
          onMentorSubjectsChange(next);
        }}
      />

      {editTarget ? (
        <EditMentorSubjectDialog
          open={editTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
            }
          }}
          subject={editTarget}
          onUpdated={(updated) => {
            const next = uniqueById(
              draftSubjects.map((row) => (row.id === updated.id ? updated : row))
            );
            setDraftSubjects(next);
            setBaselineKey(orderKey(next));
            onMentorSubjectsChange(next);
          }}
        />
      ) : null}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeletePending}
        >
          <DialogHeader>
            <DialogTitle>Delete mentor subject</DialogTitle>
            <DialogDescription>
              This permanently deletes{" "}
              {deleteTarget?.name ?? "this mentor subject"} and removes all
              instructor capability checkboxes for it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletePending}
              onClick={() => handleDeleteOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletePending}
              onClick={handleConfirmDelete}
            >
              {isDeletePending ? (
                <>
                  <InlineSpinner />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
