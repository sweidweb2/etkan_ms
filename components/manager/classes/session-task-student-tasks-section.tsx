"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";
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
import { getManagerSessionStudentTasksPreview } from "@/lib/constants/manager-session-student-tasks-mock";
import { SESSION_STUDENT_TASK_TABLE_LIMITS } from "@/lib/constants/manager-class-session-detail-display";
import { upsertPreviewStudentTask } from "@/lib/preview/manager-student-tasks-store";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerSessionTaskRow,
  ManagerStudentTaskRow,
} from "@/types/manager-class-session-detail";

type SessionTaskStudentTasksSectionProps = {
  classId: string;
  task: ManagerSessionTaskRow;
  studentTasks: ManagerStudentTaskRow[];
  onStudentTasksChange: (studentTasks: ManagerStudentTaskRow[]) => void;
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
  classId,
  task,
  studentTasks,
  onStudentTasksChange,
}: SessionTaskStudentTasksSectionProps) {
  const [selectedStudentTask, setSelectedStudentTask] =
    useState<ManagerStudentTaskRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

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
    upsertPreviewStudentTask(updated);
    onStudentTasksChange(
      studentTasks.map((row) => (row.id === updated.id ? updated : row))
    );
  };

  return (
    <TooltipProvider>
      <EditStudentTaskSheet
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        studentTask={selectedStudentTask}
        maxGrade={task.max_grade}
        onUpdateStudentTask={handleUpdateStudentTask}
      />

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
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Graded</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudentTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
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
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit task for ${studentTask.full_name}`}
                            onClick={() => handleOpenEdit(studentTask)}
                          >
                            <PencilIcon />
                          </Button>
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
