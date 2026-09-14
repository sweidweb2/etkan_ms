"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { deleteSessionTaskAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { EditSessionTaskDialog } from "@/components/manager/classes/edit-session-task-dialog";
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
import {
  getManagerClassDetailRoute,
  getManagerClassSessionDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type {
  DeleteSessionTaskActionState,
  ManagerSessionTaskRow,
  ManagerStudentTaskRow,
  ManagerStudentTaskUploadRow,
} from "@/types/manager-class-session-detail";

const initialDeleteState: DeleteSessionTaskActionState = {};

type SessionTaskDetailsPanelProps = {
  task: ManagerSessionTaskRow;
  session: ManagerClassSessionRow;
  classRow: {
    id: string;
    name: string;
  };
  initialStudentTasks: ManagerStudentTaskRow[];
  initialUploads?: ManagerStudentTaskUploadRow[];
  lockedUserIds?: string[];
  hasComputedGrades?: boolean;
};


function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

export function SessionTaskDetailsPanel({
  task: initialTask,
  session,
  classRow,
  initialStudentTasks,
  initialUploads = [],
  lockedUserIds = [],
  hasComputedGrades = false,
}: SessionTaskDetailsPanelProps) {
  const [task, setTask] = useState(initialTask);
  const [studentTasks, setStudentTasks] = useState(initialStudentTasks);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteSessionTaskAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    setIsDeleteOpen
  );

  useActionStateToast(deleteState, isDeleteActionPending);

  const sessionLabel = `S${session.nb_order} · ${session.topic}`;
  const structureLockedTitle = hasComputedGrades
    ? CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR
    : undefined;

  function handleTaskUpdated(
    nextTask: ManagerSessionTaskRow,
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

  function handleConfirmDelete() {
    const formData = new FormData();
    formData.set("id", task.id);
    formData.set("class_id", classRow.id);
    formData.set("session_id", session.id);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_CLASSES}>
              Manage classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={getManagerClassDetailRoute(classRow.id)}>
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={getManagerClassSessionDetailRoute(classRow.id, session.id)}
            >
              {sessionLabel}
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
            <DetailField label="Due date" value={formatDateTime(task.due_date)} />
            <DetailField
              label="Max grade"
              value={task.max_grade === null ? "—" : String(task.max_grade)}
              className="tabular-nums"
            />
            <DetailField label="Session">
              <Link
                href={getManagerClassSessionDetailRoute(classRow.id, session.id)}
                className="text-primary underline-offset-4 hover:underline"
              >
                {sessionLabel}
              </Link>
            </DetailField>
            <DetailField label="Class">
              <Link
                href={getManagerClassDetailRoute(classRow.id)}
                className="text-primary underline-offset-4 hover:underline"
              >
                {classRow.name}
              </Link>
            </DetailField>
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

      <EditSessionTaskDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        task={task}
        classId={classRow.id}
        sessionId={session.id}
        sessionLabel={sessionLabel}
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
