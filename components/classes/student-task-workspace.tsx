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
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_28px_-20px_rgb(42_42_82/0.28)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.35),0_16px_32px_-22px_rgb(0_0_0/0.55)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Student tasks</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Select a student to review uploads, grades, and notes.
          </p>
        </div>
        <ExportStudentTaskUploadsButton
          taskId={task.id}
          taskTitle={task.title}
        />
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

          <div className="min-w-0 flex-1 bg-[linear-gradient(180deg,rgb(255_255_255/0.45)_0%,transparent_7rem)] p-5 pb-10 sm:p-6 sm:pb-12 dark:bg-[linear-gradient(180deg,rgb(255_255_255/0.03)_0%,transparent_7rem)]">
            {selectedStudentTask ? (
              <div className="flex min-h-0 flex-1 flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4">
                  <div className="min-w-0">
                    <p className="mb-1 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                      Student task
                    </p>
                    <h3 className="truncate text-xl font-semibold tracking-tight">
                      {selectedStudentTask.full_name}
                    </h3>
                    <div className="mt-2">
                      <StudentTaskStatusBadge
                        status={selectedStudentTask.status}
                      />
                    </div>
                  </div>
                </div>

                <StudentUploadsPanel
                  key={selectedStudentTask.id}
                  studentTaskId={selectedStudentTask.id}
                  uploads={selectedUploads}
                  locked={selectedLocked}
                  onUploadsChange={setUploads}
                />

                <div className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
                  <InlineStudentTaskForm
                    key={selectedStudentTask.id}
                    studentTask={selectedStudentTask}
                    maxGrade={task.max_grade}
                    isYesNo={task.is_yes_no}
                    dueDate={task.due_date}
                    readOnly={selectedLocked}
                    onUpdateStudentTask={handleUpdateStudentTask}
                  />
                </div>
              </div>
            ) : (
              <EmptyState
                size="sm"
                icon={ClipboardListIcon}
                title="Select a student"
                description="Choose a student from the list to view uploads and grades."
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
