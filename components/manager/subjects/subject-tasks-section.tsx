"use client";

import { useState } from "react";
import { ClipboardListIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { deleteSubjectTaskAction } from "@/app/manager/subjects/actions";
import { Can } from "@/components/auth/can";
import { SubjectCollapsibleSection } from "@/components/manager/subjects/subject-collapsible-section";
import { SubjectTaskFormDialog } from "@/components/manager/subjects/subject-task-form-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDestructiveDialog } from "@/components/ui/confirm-destructive-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import { SESSION_TASK_TABLE_LIMITS } from "@/lib/constants/manager-class-session-detail-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  DeleteSubjectTaskActionState,
  ManagerSubjectTaskRow,
} from "@/types/manager-subject-task";

const initialDeleteState: DeleteSubjectTaskActionState = {};

type SubjectTasksSectionProps = {
  subjectId: string;
  subjectName: string;
  tasks: ManagerSubjectTaskRow[];
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
}: SubjectTasksSectionProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ManagerSubjectTaskRow | null>(
    null
  );
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
        setTasks((current) => current.filter((row) => row.id !== removedId));
      }
      setDeletingTask(null);
    },
  });

  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const nextSortOrder =
    tasks.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;

  function handleSaved(task: ManagerSubjectTaskRow) {
    setTasks((current) =>
      sortTasks([task, ...current.filter((row) => row.id !== task.id)])
    );
  }

  return (
    <>
      <SubjectTaskFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        subjectId={subjectId}
        subjectName={subjectName}
        nextSortOrder={nextSortOrder}
        onSaved={handleSaved}
      />

      {editingTask ? (
        <SubjectTaskFormDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditingTask(null);
            }
          }}
          subjectId={subjectId}
          subjectName={subjectName}
          task={editingTask}
          nextSortOrder={nextSortOrder}
          onSaved={handleSaved}
        />
      ) : null}

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

      <SubjectCollapsibleSection
        title="Tasks"
        description="Subject tasks that can be cloned onto classes of this subject."
        defaultOpen
      >
        <div className="flex flex-col gap-3">
          <Can permission={PERMISSIONS.SUBJECTS_TASKS_CREATE}>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setIsAddOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Create task
              </Button>
            </div>
          </Can>

          {tasks.length === 0 ? (
            <EmptyState
              size="sm"
              icon={ClipboardListIcon}
              title="No tasks yet"
              description="No tasks defined for this subject yet."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Period (days)</th>
                    <th className="px-4 py-3 font-medium">Max grade</th>
                    <Can
                      anyOf={[
                        PERMISSIONS.SUBJECTS_TASKS_UPDATE,
                        PERMISSIONS.SUBJECTS_TASKS_DELETE,
                      ]}
                    >
                      <th className="px-4 py-3 text-right font-medium">
                        Actions
                      </th>
                    </Can>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-b-0">
                      <td className="max-w-[14rem] px-4 py-3 font-medium">
                        <span className="block truncate" title={task.title}>
                          {truncateText(
                            task.title,
                            SESSION_TASK_TABLE_LIMITS.title
                          ).display}
                        </span>
                      </td>
                      <td className="max-w-[18rem] px-4 py-3 text-muted-foreground">
                        <span
                          className="block truncate"
                          title={task.description ?? undefined}
                        >
                          {truncateText(
                            task.description ?? "—",
                            SESSION_TASK_TABLE_LIMITS.description
                          ).display}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                        {task.period}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                        {task.max_grade ?? "—"}
                      </td>
                      <Can
                        anyOf={[
                          PERMISSIONS.SUBJECTS_TASKS_UPDATE,
                          PERMISSIONS.SUBJECTS_TASKS_DELETE,
                        ]}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Can permission={PERMISSIONS.SUBJECTS_TASKS_UPDATE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit task ${task.title}`}
                                onClick={() => setEditingTask(task)}
                              >
                                <PencilIcon />
                              </Button>
                            </Can>
                            <Can permission={PERMISSIONS.SUBJECTS_TASKS_DELETE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Delete task ${task.title}`}
                                onClick={() => setDeletingTask(task)}
                              >
                                <Trash2Icon className="text-destructive" />
                              </Button>
                            </Can>
                          </div>
                        </td>
                      </Can>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SubjectCollapsibleSection>
    </>
  );
}
