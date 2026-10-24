"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import { useActionState, useState, useTransition } from "react";
import { PencilIcon, PlayIcon, SquareIcon, Trash2Icon } from "lucide-react";
import {
  deleteTeacherClassTaskAction,
  setTeacherClassTaskStartedAction,
} from "@/app/teacher/classes/actions";
import { Can } from "@/components/auth/can";
import { StudentTaskWorkspace } from "@/components/classes/student-task-workspace";
import { EditClassTaskDialog } from "@/components/manager/classes/edit-class-task-dialog";
import { SessionTaskAnalyticsSection } from "@/components/manager/classes/session-task-analytics-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { useTeacherTaskDetailAnalytics } from "@/hooks/use-teacher-task-detail-analytics";
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
import { PERMISSIONS } from "@/lib/constants/permissions";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type {
  DeleteClassTaskActionState,
  ManagerClassTaskRow,
  ManagerStudentTaskRow,
  ManagerStudentTaskUploadRow,
  SetClassTaskStartedActionState,
} from "@/types/manager-class-session-detail";

const initialDeleteState: DeleteClassTaskActionState = {};
const initialStartedState: SetClassTaskStartedActionState = {};

type TeacherClassTaskDetailsPanelProps = {
  task: ManagerClassTaskRow;
  classRow: {
    id: string;
    name: string;
  };
  initialStudentTasks: ManagerStudentTaskRow[];
  initialUploads?: ManagerStudentTaskUploadRow[];
  lockedUserIds?: string[];
  hasComputedGrades?: boolean;
  navigation: {
    classesListHref: string;
    classesListLabel: string;
    classDetailHref: string;
  };
};

/**
 * Teacher task details shell: compact task info + student workspace.
 */
export function TeacherClassTaskDetailsPanel({
  task: initialTask,
  classRow,
  initialStudentTasks,
  initialUploads = [],
  lockedUserIds = [],
  hasComputedGrades = false,
  navigation,
}: TeacherClassTaskDetailsPanelProps) {
  const { enabled: showAnalytics, hasHydrated: analyticsHydrated } =
    useTeacherTaskDetailAnalytics();
  const [task, setTask] = useState(initialTask);
  const [prevInitialTask, setPrevInitialTask] = useState(initialTask);
  const [studentTasks, setStudentTasks] = useState(initialStudentTasks);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteTeacherClassTaskAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    setIsDeleteOpen
  );
  const [startedState, startedAction, isStartedPending] = useFormActionState(
    setTeacherClassTaskStartedAction,
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
    formData.set("return_to", navigation.classDetailHref);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={navigation.classesListHref} prefetch={false}>
              {navigation.classesListLabel}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={navigation.classDetailHref} prefetch={false}>
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
        <CardContent className="pt-3 pb-4">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField label="Title" value={task.title} />
            <DetailField
              label="Description"
              value={task.description?.trim() ? task.description : "—"}
            />
            <DetailField
              label="Max grade"
              value={task.max_grade === null ? "—" : String(task.max_grade)}
              className="tabular-nums"
            />
            <DetailField
              label="Period (days)"
              value={String(task.period)}
              className="tabular-nums"
            />
          </dl>
        </CardContent>
      </Card>

      <StudentTaskWorkspace
        task={task}
        studentTasks={studentTasks}
        initialUploads={initialUploads}
        onStudentTasksChange={setStudentTasks}
        lockedUserIds={lockedUserIds}
      />

      {analyticsHydrated && showAnalytics ? (
        <SessionTaskAnalyticsSection
          studentTasks={studentTasks}
          maxGrade={task.max_grade}
        />
      ) : null}

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
