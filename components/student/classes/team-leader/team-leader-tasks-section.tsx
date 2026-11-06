"use client";

import { useState, type ReactElement } from "react";
import { format } from "date-fns";
import { ClipboardListIcon, PencilIcon, PlayIcon, PlusIcon } from "lucide-react";
import {
  createTeamLeaderClassTaskAction,
  startTeamLeaderClassTaskAction,
  updateTeamLeaderClassTaskAction,
} from "@/app/(panels)/student/classes/team-leader-actions";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { AddClassTaskDialog } from "@/components/manager/classes/add-class-task-dialog";
import { EditClassTaskDialog } from "@/components/manager/classes/edit-class-task-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { formatTaskMaxGrade } from "@/lib/format/format-task-grade";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import { cn } from "@/lib/utils";
import type {
  ManagerClassTaskRow,
  SetClassTaskStartedActionState,
} from "@/types/manager-class-session-detail";

const initialStartState: SetClassTaskStartedActionState = {};

type TeamLeaderTasksSectionProps = {
  classId: string;
  className: string;
  initialTasks: ManagerClassTaskRow[];
  hasComputedGrades: boolean;
};

function sortTasks(tasks: ManagerClassTaskRow[]) {
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

function LockedButton({
  children,
  locked,
}: {
  children: ReactElement;
  locked: boolean;
}) {
  if (!locked) {
    return children;
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR}</TooltipContent>
    </Tooltip>
  );
}

export function TeamLeaderTasksSection({
  classId,
  className,
  initialTasks,
  hasComputedGrades,
}: TeamLeaderTasksSectionProps) {
  const [tasks, setTasks] = useState(() => sortTasks(initialTasks));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ManagerClassTaskRow | null>(
    null
  );
  const [startingTask, setStartingTask] = useState<ManagerClassTaskRow | null>(
    null
  );

  const [startState, startAction, isStartPending] = useFormActionState(
    startTeamLeaderClassTaskAction,
    initialStartState
  );
  const handleStartOpenChange = usePendingAwareOpenChange(
    isStartPending,
    (open) => {
      if (!open) {
        setStartingTask(null);
      }
    }
  );

  useActionStateToast(startState, isStartPending);
  useActionStateSuccess(startState, isStartPending, (nextState) => {
    if (nextState.task) {
      replaceTask(nextState.task);
    }
    setStartingTask(null);
  });

  function replaceTask(task: ManagerClassTaskRow) {
    setTasks((current) =>
      sortTasks(current.map((row) => (row.id === task.id ? task : row)))
    );
  }

  function handleConfirmStart() {
    if (!startingTask) {
      return;
    }
    const formData = new FormData();
    formData.set("id", startingTask.id);
    formData.set("class_id", classId);
    startAction(formData);
  }

  return (
    <TooltipProvider>
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Tasks</h3>
            <p className="text-sm text-muted-foreground">
              Create, edit, and start tasks for {className}.
            </p>
          </div>
          <Can permission={PERMISSIONS.TEAM_LEADER_TASKS_CREATE}>
            <LockedButton locked={hasComputedGrades}>
              <Button
                type="button"
                disabled={hasComputedGrades}
                onClick={() => setIsAddOpen(true)}
              >
                <PlusIcon data-icon="inline-start" />
                Create task
              </Button>
            </LockedButton>
          </Can>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            size="sm"
            icon={ClipboardListIcon}
            title="No tasks yet"
            description="No tasks created for this class yet."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table className="min-w-[40rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 px-3">Task</TableHead>
                  <TableHead className="h-9 px-3">Period</TableHead>
                  <TableHead className="h-9 px-3">Max grade</TableHead>
                  <TableHead className="h-9 px-3">Status</TableHead>
                  <TableHead className="h-9 px-3">Due</TableHead>
                  <TableHead className="h-9 px-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="max-w-[16rem] px-3 py-2 font-medium whitespace-normal">
                      <span className="line-clamp-2">{task.title}</span>
                    </TableCell>
                    <TableCell className="px-3 py-2 tabular-nums text-muted-foreground">
                      {task.period}d
                    </TableCell>
                    <TableCell className="px-3 py-2 tabular-nums">
                      {formatTaskMaxGrade({
                        maxGrade: task.max_grade,
                        isYesNo: task.is_yes_no,
                      })}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                          task.started
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {task.started ? "Started" : "Not started"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">
                      {task.due_date
                        ? format(new Date(task.due_date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Can permission={PERMISSIONS.TEAM_LEADER_TASKS_UPDATE}>
                          <LockedButton locked={hasComputedGrades}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={hasComputedGrades}
                              onClick={() => setEditingTask(task)}
                              aria-label={`Edit ${task.title}`}
                            >
                              <PencilIcon data-icon="inline-start" />
                              Edit
                            </Button>
                          </LockedButton>
                        </Can>
                        {task.started ? null : (
                          <Can permission={PERMISSIONS.TEAM_LEADER_TASKS_START}>
                            <LockedButton locked={hasComputedGrades}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={hasComputedGrades}
                                onClick={() => setStartingTask(task)}
                                aria-label={`Start ${task.title}`}
                              >
                                <PlayIcon data-icon="inline-start" />
                                Start
                              </Button>
                            </LockedButton>
                          </Can>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <AddClassTaskDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        classId={classId}
        className={className}
        action={createTeamLeaderClassTaskAction}
        onCreateTask={(task) => {
          setTasks((current) =>
            sortTasks([task, ...current.filter((row) => row.id !== task.id)])
          );
        }}
      />

      {editingTask ? (
        <EditClassTaskDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditingTask(null);
            }
          }}
          task={editingTask}
          classId={classId}
          className={className}
          action={updateTeamLeaderClassTaskAction}
          onTaskUpdated={(task) => replaceTask(task)}
        />
      ) : null}

      <Dialog open={startingTask !== null} onOpenChange={handleStartOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={!isStartPending}>
          <DialogHeader>
            <DialogTitle>Start task</DialogTitle>
            <DialogDescription>
              Start {startingTask?.title ?? "this task"}? Students can submit
              right away and the due date is set to {startingTask?.period ?? 0}{" "}
              day(s) from now. A started task can&apos;t be un-started by a team
              leader.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleStartOpenChange(false)}
              disabled={isStartPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmStart}
              disabled={isStartPending}
            >
              {isStartPending ? <InlineSpinner /> : null}
              Start task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
