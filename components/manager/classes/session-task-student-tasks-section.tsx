"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { EyeIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditStudentTaskSheet } from "@/components/manager/classes/edit-student-task-sheet";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SESSION_STUDENT_TASK_TABLE_LIMITS } from "@/lib/constants/manager-class-session-detail-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerStudentDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerSessionTaskRow,
  ManagerStudentTaskRow,
} from "@/types/manager-class-session-detail";

type UpdateStudentTaskFormAction = (
  prevState: import("@/types/manager-class-session-detail").UpdateStudentTaskActionState,
  formData: FormData
) => Promise<
  import("@/types/manager-class-session-detail").UpdateStudentTaskActionState
>;

type SessionTaskStudentTasksSectionProps = {
  task: ManagerSessionTaskRow;
  studentTasks: ManagerStudentTaskRow[];
  onStudentTasksChange: (studentTasks: ManagerStudentTaskRow[]) => void;
  lockedUserIds?: string[];
  /** When false, hides manager student profile links (teacher panel). */
  showStudentProfileLink?: boolean;
  updateStudentTaskAction?: UpdateStudentTaskFormAction;
};

function TruncatedCell({
  value,
  maxLength,
  className,
}: {
  value: string;
  maxLength: number;
  className?: string;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  if (!isTruncated) {
    return <span className={cn("block truncate", className)}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("block cursor-default truncate", className)}
            tabIndex={0}
          />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

function formatDateTimeCell(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

export function SessionTaskStudentTasksSection({
  task,
  studentTasks,
  onStudentTasksChange,
  lockedUserIds = [],
  showStudentProfileLink = true,
  updateStudentTaskAction,
}: SessionTaskStudentTasksSectionProps) {
  const [selectedStudentTask, setSelectedStudentTask] =
    useState<ManagerStudentTaskRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const lockedUserIdSet = useMemo(
    () => new Set(lockedUserIds),
    [lockedUserIds]
  );
  const selectedTaskLocked = selectedStudentTask
    ? lockedUserIdSet.has(selectedStudentTask.student_id)
    : false;

  const sortedStudentTasks = useMemo(
    () =>
      [...studentTasks].sort((left, right) =>
        left.full_name.localeCompare(right.full_name)
      ),
    [studentTasks]
  );

  const handleOpenEdit = (studentTask: ManagerStudentTaskRow) => {
    setSelectedStudentTask(studentTask);
    setIsEditOpen(true);
  };

  const handleUpdateStudentTask = (updated: ManagerStudentTaskRow) => {
    onStudentTasksChange(
      studentTasks.map((row) => (row.id === updated.id ? updated : row))
    );
  };

  return (
    <TooltipProvider>
      {isEditOpen && selectedStudentTask ? (
        <EditStudentTaskSheet
          open
          onOpenChange={(nextOpen) => {
            setIsEditOpen(nextOpen);
            if (!nextOpen) {
              setSelectedStudentTask(null);
            }
          }}
          studentTask={selectedStudentTask}
          maxGrade={task.max_grade}
          dueDate={task.due_date}
          onUpdateStudentTask={handleUpdateStudentTask}
          readOnly={selectedTaskLocked}
          action={updateStudentTaskAction}
        />
      ) : null}

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Student tasks</CardTitle>
          <p className="text-sm text-muted-foreground">
            One row per enrolled student for this assignment (
            {sortedStudentTasks.length} total).
          </p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Graded</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium">Report</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudentTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No student task records for this assignment yet.
                    </td>
                  </tr>
                ) : (
                  sortedStudentTasks.map((studentTask) => (
                    <tr
                      key={studentTask.id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="max-w-[12rem] px-4 py-3">
                        <TruncatedCell
                          value={studentTask.full_name}
                          maxLength={SESSION_STUDENT_TASK_TABLE_LIMITS.fullName}
                          className="font-medium"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StudentTaskStatusBadge status={studentTask.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                        {studentTask.grade ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDateTimeCell(studentTask.submitted_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDateTimeCell(studentTask.graded_at)}
                      </td>
                      <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                        <TruncatedCell
                          value={studentTask.notes ?? "—"}
                          maxLength={SESSION_STUDENT_TASK_TABLE_LIMITS.notes}
                        />
                      </td>
                      <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                        <TruncatedCell
                          value={studentTask.student_report ?? "—"}
                          maxLength={
                            SESSION_STUDENT_TASK_TABLE_LIMITS.studentReport
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {showStudentProfileLink &&
                          studentTask.student_profile_id ? (
                            <Link
                              href={getManagerStudentDetailRoute(
                                studentTask.student_profile_id
                              )}
                              aria-label={`View ${studentTask.full_name}`}
                              className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <EyeIcon className="size-4" />
                            </Link>
                          ) : null}
                          <Can permission={PERMISSIONS.TASKS_UPDATE_STUDENT}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit task for ${studentTask.full_name}`}
                              onClick={() => handleOpenEdit(studentTask)}
                            >
                              <PencilIcon />
                            </Button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
