"use client";

import { useState } from "react";
import { ClipboardListIcon, PlusIcon } from "lucide-react";
import { deleteSubjectTaskAction } from "@/app/manager/subjects/actions";
import { Can } from "@/components/auth/can";
import { SubjectTaskDetailPanel } from "@/components/manager/subjects/subject-task-detail-panel";
import { SubjectTaskFormDialog } from "@/components/manager/subjects/subject-task-form-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDestructiveDialog } from "@/components/ui/confirm-destructive-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import type {
  DeleteSubjectTaskActionState,
  ManagerSubjectTaskRow,
} from "@/types/manager-subject-task";
import type { TaskAttachmentRow } from "@/types/task-attachment";

const initialDeleteState: DeleteSubjectTaskActionState = {};

type SubjectTasksSectionProps = {
  subjectId: string;
  subjectName: string;
  tasks: ManagerSubjectTaskRow[];
  attachmentsByTaskId?: Record<string, TaskAttachmentRow[]>;
};

function sortTasks(tasks: ManagerSubjectTaskRow[]) {
  return [...tasks].sort((left, right) => {
    const orderCompare = left.sort_order - right.sort_order;
    if (orderCompare !== 0) {
      return orderCompare;
    }

    return (
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
  });
}

export function SubjectTasksSection({
  subjectId,
  subjectName,
  tasks: initialTasks,
  attachmentsByTaskId: initialAttachmentsByTaskId = {},
}: SubjectTasksSectionProps) {
  const [tasks, setTasks] = useState(() => sortTasks(initialTasks));
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  const [attachmentsByTaskId, setAttachmentsByTaskId] = useState(
    initialAttachmentsByTaskId
  );
  const [prevAttachmentsByTaskId, setPrevAttachmentsByTaskId] = useState(
    initialAttachmentsByTaskId
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    () => sortTasks(initialTasks)[0]?.id ?? null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingTask, setDeletingTask] =
    useState<ManagerSubjectTaskRow | null>(null);

  const {
    formAction: deleteAction,
    isPending: isDeletePending,
    handleOpenChange: handleDeleteOpenChange,
  } = useMutationDialogForm({
    action: deleteSubjectTaskAction,
    initialState: initialDeleteState,
    open: deletingTask !== null,
    onOpenChange: (open) => {
      if (!open) {
        setDeletingTask(null);
      }
    },
    onSuccess: (nextState) => {
      const removedId =
        typeof nextState.taskId === "string"
          ? nextState.taskId
          : deletingTask?.id;
      if (removedId) {
        setTasks((current) => {
          const next = current.filter((row) => row.id !== removedId);
          if (selectedTaskId === removedId) {
            setSelectedTaskId(next[0]?.id ?? null);
            setIsEditing(false);
          }
          return next;
        });
        setAttachmentsByTaskId((current) => {
          const { [removedId]: _removed, ...rest } = current;
          return rest;
        });
      }
      setDeletingTask(null);
    },
  });

  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    const sorted = sortTasks(initialTasks);
    setTasks(sorted);
    if (
      selectedTaskId &&
      !sorted.some((task) => task.id === selectedTaskId)
    ) {
      setSelectedTaskId(sorted[0]?.id ?? null);
      setIsEditing(false);
    } else if (!selectedTaskId && sorted[0]) {
      setSelectedTaskId(sorted[0].id);
    }
  }

  if (initialAttachmentsByTaskId !== prevAttachmentsByTaskId) {
    setPrevAttachmentsByTaskId(initialAttachmentsByTaskId);
    setAttachmentsByTaskId(initialAttachmentsByTaskId);
  }

  const nextSortOrder =
    tasks.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;

  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) ?? null;

  function handleSaved(task: ManagerSubjectTaskRow) {
    setTasks((current) =>
      sortTasks([task, ...current.filter((row) => row.id !== task.id)])
    );
    setSelectedTaskId(task.id);
    setIsEditing(false);
  }

  function selectTask(taskId: string) {
    if (taskId === selectedTaskId) {
      return;
    }
    setSelectedTaskId(taskId);
    setIsEditing(false);
  }

  return (
    <>
      <SubjectTaskFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        subjectId={subjectId}
        subjectName={subjectName}
        nextSortOrder={nextSortOrder}
        onSaved={(task) => {
          handleSaved(task);
          setAttachmentsByTaskId((current) => ({
            ...current,
            [task.id]: current[task.id] ?? [],
          }));
          setIsAddOpen(false);
        }}
      />

      <ConfirmDestructiveDialog
        open={deletingTask !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete subject task"
        description={
          deletingTask
            ? `This will delete “${deletingTask.title}” from ${subjectName}. Classes that already copied this task keep their own copy.`
            : "Delete this task?"
        }
        isPending={isDeletePending}
        canConfirm={Boolean(deletingTask)}
        formAction={deleteAction}
        confirmLabel="Delete"
      >
        {deletingTask ? (
          <>
            <input type="hidden" name="id" value={deletingTask.id} />
            <input type="hidden" name="subject_id" value={subjectId} />
          </>
        ) : null}
      </ConfirmDestructiveDialog>

      {tasks.length === 0 ? (
        <div className="flex flex-col gap-3">
          <Can permission={PERMISSIONS.SUBJECTS_TASKS_CREATE}>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setIsAddOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Create task
              </Button>
            </div>
          </Can>
          <EmptyState
            size="sm"
            icon={ClipboardListIcon}
            title="No tasks yet"
            description="No tasks defined for this subject yet."
          />
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card">
          <div className="flex flex-col @lg/panel:flex-row">
            <aside className="flex w-full shrink-0 flex-col border-b border-border/60 @lg/panel:w-64 @lg/panel:border-b-0 @lg/panel:border-r">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
                <div>
                  <h3 className="text-sm font-semibold">Tasks</h3>
                  <p className="text-xs text-muted-foreground">
                    {tasks.length} template{tasks.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Can permission={PERMISSIONS.SUBJECTS_TASKS_CREATE}>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label="Create task"
                    onClick={() => setIsAddOpen(true)}
                  >
                    <PlusIcon />
                  </Button>
                </Can>
              </div>
              <ul className="max-h-64 overflow-y-auto p-2 @lg/panel:max-h-[min(36rem,70vh)]">
                {tasks.map((task) => {
                  const selected = task.id === selectedTask?.id;
                  const fileCount =
                    attachmentsByTaskId[task.id]?.length ?? 0;
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => selectTask(task.id)}
                        className={cn(
                          "flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "bg-primary/10 text-foreground"
                            : "text-foreground hover:bg-muted/60"
                        )}
                      >
                        <span className="line-clamp-2 text-sm font-medium">
                          {task.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {task.period}d
                          {fileCount > 0
                            ? ` · ${fileCount} file${fileCount === 1 ? "" : "s"}`
                            : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <div className="min-w-0 flex-1 p-4 sm:p-5">
              {selectedTask ? (
                <SubjectTaskDetailPanel
                  subjectId={subjectId}
                  task={selectedTask}
                  attachments={attachmentsByTaskId[selectedTask.id] ?? []}
                  isEditing={isEditing}
                  onEditingChange={setIsEditing}
                  onSaved={handleSaved}
                  onAttachmentsChange={(rows) => {
                    setAttachmentsByTaskId((current) => ({
                      ...current,
                      [selectedTask.id]: rows,
                    }));
                  }}
                  onDelete={() => setDeletingTask(selectedTask)}
                />
              ) : (
                <EmptyState
                  size="sm"
                  icon={ClipboardListIcon}
                  title="Select a task"
                  description="Choose a task from the list to view its details."
                />
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
