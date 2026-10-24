"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import { PencilIcon, PlayIcon, SquareIcon, Trash2Icon } from "lucide-react";
import {
  deleteClassTaskAction,
  setClassTaskStartedAction,
} from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { EditClassTaskDialog } from "@/components/manager/classes/edit-class-task-dialog";
import { SessionTaskStudentTasksSection } from "@/components/manager/classes/session-task-student-tasks-section";
import { SessionTaskUploadsSection } from "@/components/manager/classes/session-task-uploads-section";
import { SessionTaskAnalyticsSection } from "@/components/manager/classes/session-task-analytics-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
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
import { getManagerClassDetailRoute, ROUTES } from "@/lib/constants/routes";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { cn } from "@/lib/utils";
import type {
  DeleteClassTaskActionState,
  ManagerClassTaskRow,
  ManagerStudentTaskRow,
  ManagerStudentTaskUploadRow,
  SetClassTaskStartedActionState,
} from "@/types/manager-class-session-detail";

const initialDeleteState: DeleteClassTaskActionState = {};
const initialStartedState: SetClassTaskStartedActionState = {};

type ClassTaskDetailsPanelProps = {
  task: ManagerClassTaskRow;
  classRow: {
    id: string;
    name: string;
  };
  initialStudentTasks: ManagerStudentTaskRow[];
  initialUploads?: ManagerStudentTaskUploadRow[];
  lockedUserIds?: string[];
  hasComputedGrades?: boolean;
  /** Panel navigation (defaults to manager class routes). */
  navigation?: {
    classesListHref: string;
    classesListLabel: string;
    classDetailHref: string;
  };
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

export function ClassTaskDetailsPanel({
  task: initialTask,
  classRow,
  initialStudentTasks,
  initialUploads = [],
  lockedUserIds = [],
  hasComputedGrades = false,
  navigation,
}: ClassTaskDetailsPanelProps) {
  const nav = navigation ?? {
    classesListHref: ROUTES.MANAGER_CLASSES,
    classesListLabel: "Manage classes",
    classDetailHref: getManagerClassDetailRoute(classRow.id),
  };
  const [task, setTask] = useState(initialTask);
  const [prevInitialTask, setPrevInitialTask] = useState(initialTask);
  const [studentTasks, setStudentTasks] = useState(initialStudentTasks);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteClassTaskAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    setIsDeleteOpen
  );
  const [startedState, startedAction, isStartedPending] = useFormActionState(
    setClassTaskStartedAction,
    initialStartedState
  );

  if (initialTask !== prevInitialTask) {
    setPrevInitialTask(initialTask);
    setTask(initialTask);
  }

  useActionStateToast(deleteState, isDeleteActionPending);
  useActionStateToast(startedState, isStartedPending);

  useActionStateSuccess(
    startedState,
    isStartedPending,
    (nextState) => {
      if (nextState.task) {
        setTask(nextState.task);
      }
    },
    (nextState) => Boolean(nextState.success && nextState.task)
  );

  const structureLockedTitle = hasComputedGrades
    ? CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR
    : undefined;

  function handleTaskUpdated(
    nextTask: ManagerClassTaskRow,
    options?: { gradesClamped?: boolean }
  ) {
    setTask(nextTask);

    if (options?.gradesClamped && nextTask.max_grade != null) {
      const maxGrade = nextTask.max_grade;
      setStudentTasks((current) =>
        current.map((row) =>
          row.grade != null && row.grade > maxGrade
            ? { ...row, grade: maxGrade }
            : row
        )
      );
    }
  }

  function handleToggleStarted() {
    const formData = new FormData();
    formData.set("id", task.id);
    formData.set("class_id", classRow.id);
    formData.set("started", task.started ? "false" : "true");
    startedAction(formData);
  }

  function handleConfirmDelete() {
    const formData = new FormData();
    formData.set("id", task.id);
    formData.set("class_id", classRow.id);
    formData.set("return_to", nav.classDetailHref);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={nav.classesListHref} prefetch={false}>
              {nav.classesListLabel}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={nav.classDetailHref} prefetch={false}>
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{task.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/50 py-3">
          <CardTitle className="text-xl">{task.title}</CardTitle>
          <div className="flex items-center gap-1">
            <Can permission={PERMISSIONS.TASKS_UPDATE}>
              <Button
                type="button"
                variant={task.started ? "outline" : "default"}
                size="sm"
                disabled={hasComputedGrades || isStartedPending}
                title={structureLockedTitle}
                onClick={handleToggleStarted}
              >
                {isStartedPending ? (
                  <InlineSpinner />
                ) : task.started ? (
                  <SquareIcon data-icon="inline-start" />
                ) : (
                  <PlayIcon data-icon="inline-start" />
                )}
                {task.started ? "Unstart" : "Start"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Edit task"
                disabled={hasComputedGrades}
                title={structureLockedTitle}
                onClick={() => setIsEditOpen(true)}
              >
                <PencilIcon />
              </Button>
            </Can>
            <Can permission={PERMISSIONS.TASKS_DELETE}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Delete task"
                disabled={hasComputedGrades || isDeleteActionPending}
                title={structureLockedTitle}
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2Icon className="text-destructive" />
              </Button>
            </Can>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Title" value={task.title} />
            <DetailField label="Description" value={task.description ?? "—"} />
            <DetailField label="Started">
              <span
                className={cn(
                  "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium",
                  task.started
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {task.started ? "Yes" : "No"}
              </span>
            </DetailField>
            <DetailField
              label="Period (days)"
              value={String(task.period)}
              className="tabular-nums"
            />
            <DetailField
              label="Started at"
              value={formatDateTime(task.started_at)}
            />
            <DetailField label="Due date" value={formatDateTime(task.due_date)} />
            <DetailField
              label="Max grade"
              value={task.max_grade === null ? "—" : String(task.max_grade)}
              className="tabular-nums"
            />
            <DetailField label="Class">
              <Link
                href={nav.classDetailHref}
                prefetch={false}
                className="text-primary underline-offset-4 hover:underline"
              >
                {classRow.name}
              </Link>
            </DetailField>
            <DetailField
              label="Source"
              value={
                task.source_subject_task_id
                  ? "Imported from subject"
                  : "Created on class"
              }
            />
            <DetailField
              label="Task ID"
              value={task.id}
              className="font-mono text-xs"
            />
            <DetailField label="Created" value={formatDateTime(task.created_at)} />
          </dl>
        </CardContent>
      </Card>

      <SessionTaskUploadsSection
        studentTasks={studentTasks}
        initialUploads={initialUploads}
        lockedUserIds={lockedUserIds}
      />

      <SessionTaskStudentTasksSection
        task={task}
        studentTasks={studentTasks}
        onStudentTasksChange={setStudentTasks}
        lockedUserIds={lockedUserIds}
      />

      <SessionTaskAnalyticsSection
        studentTasks={studentTasks}
        maxGrade={task.max_grade}
      />

      <EditClassTaskDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        task={task}
        classId={classRow.id}
        className={classRow.name}
        onTaskUpdated={handleTaskUpdated}
      />

      <Dialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleteActionPending}
        >
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              {isDeleteActionPending
                ? "Please wait while this task is removed."
                : `This will permanently delete “${task.title}” and all student grades for this task. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={isDeleteActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleteActionPending}
            >
              {isDeleteActionPending ? (
                <>
                  <InlineSpinner />
                  Deleting task
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
