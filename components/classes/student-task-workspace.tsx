"use client";

import { useMemo, useState } from "react";
import { ClipboardListIcon } from "lucide-react";
import { ExportStudentTaskUploadsButton } from "@/components/classes/student-task/export-student-task-uploads-button";
import { InlineStudentTaskForm } from "@/components/classes/student-task/inline-student-task-form";
import { StudentTaskList } from "@/components/classes/student-task/student-task-list";
import { StudentUploadsPanel } from "@/components/classes/student-task/student-uploads-panel";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  ManagerClassTaskRow,
  ManagerStudentTaskRow,
  ManagerStudentTaskUploadRow,
} from "@/types/manager-class-session-detail";

type StudentTaskWorkspaceProps = {
  task: ManagerClassTaskRow;
  studentTasks: ManagerStudentTaskRow[];
  initialUploads: ManagerStudentTaskUploadRow[];
  onStudentTasksChange: (studentTasks: ManagerStudentTaskRow[]) => void;
  lockedUserIds?: string[];
};

/**
 * Shared student-task workspace: student list + inline fields and uploads.
 */
export function StudentTaskWorkspace({
  task,
  studentTasks,
  initialUploads,
  onStudentTasksChange,
  lockedUserIds = [],
}: StudentTaskWorkspaceProps) {
  const sortedStudentTasks = useMemo(
    () =>
      [...studentTasks].sort((left, right) =>
        left.full_name.localeCompare(right.full_name)
      ),
    [studentTasks]
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => sortedStudentTasks[0]?.id ?? null
  );
  // Keep uploads in client state after mount. Do not reset from props on
  // RSC refresh — stale cached props were wiping newly uploaded cards.
  const [uploads, setUploads] = useState(initialUploads);
  const lockedUserIdSet = useMemo(
    () => new Set(lockedUserIds),
    [lockedUserIds]
  );

  const resolvedSelectedId =
    selectedId &&
    sortedStudentTasks.some((row) => row.id === selectedId)
      ? selectedId
      : (sortedStudentTasks[0]?.id ?? null);

  const selectedStudentTask =
    sortedStudentTasks.find((row) => row.id === resolvedSelectedId) ?? null;
  const selectedLocked = selectedStudentTask
    ? lockedUserIdSet.has(selectedStudentTask.student_id)
    : false;
  const selectedUploads = useMemo(
    () =>
      uploads.filter((upload) => upload.student_task_id === resolvedSelectedId),
    [resolvedSelectedId, uploads]
  );

  function handleUpdateStudentTask(updated: ManagerStudentTaskRow) {
    onStudentTasksChange(
      studentTasks.map((row) => (row.id === updated.id ? updated : row))
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)]">
      <header className="border-b border-border/60 bg-muted/30 px-4 py-3">
        <h2 className="text-sm font-medium tracking-tight">Student tasks</h2>
        <p className="text-xs text-muted-foreground">
          Select a student to review grades, notes, and uploads.
        </p>
      </header>

      {sortedStudentTasks.length === 0 ? (
        <div className="p-4">
          <EmptyState
            size="sm"
            icon={ClipboardListIcon}
            title="No student tasks yet"
            description="No student task rows yet for this assignment."
          />
        </div>
      ) : (
        <div className="flex min-h-[28rem] flex-col @2xl/panel:flex-row">
          <StudentTaskList
            students={sortedStudentTasks}
            selectedId={resolvedSelectedId}
            onSelect={setSelectedId}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ExportStudentTaskUploadsButton
                taskId={task.id}
                taskTitle={task.title}
              />
            </div>

            {selectedStudentTask ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight">
                    {selectedStudentTask.full_name}
                  </h3>
                  <StudentTaskStatusBadge status={selectedStudentTask.status} />
                </div>

                <InlineStudentTaskForm
                  key={selectedStudentTask.id}
                  studentTask={selectedStudentTask}
                  maxGrade={task.max_grade}
                  isYesNo={task.is_yes_no}
                  dueDate={task.due_date}
                  readOnly={selectedLocked}
                  onUpdateStudentTask={handleUpdateStudentTask}
                />

                <div className="border-t border-border/60 pt-5">
                  <StudentUploadsPanel
                    key={selectedStudentTask.id}
                    studentTaskId={selectedStudentTask.id}
                    uploads={selectedUploads}
                    locked={selectedLocked}
                    onUploadsChange={setUploads}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a student from the list.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
