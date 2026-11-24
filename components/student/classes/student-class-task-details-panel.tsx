"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DetailField } from "@/components/manager/shared/detail-field";
import { StudentTaskFiles } from "@/components/student/classes/student-task-files";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { TaskAttachmentsSection } from "@/components/tasks/task-attachments-section";
import { getStudentTaskAttachmentSignedUrlForSelfAction } from "@/app/student/classes/actions";
import {
  STUDENT_CLASS_DETAIL_TABS,
  writeStudentClassDetailTab,
} from "@/lib/constants/student-class-detail-tabs";
import {
  getStudentClassDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { TASK_ATTACHMENT_ENTITIES } from "@/lib/constants/task-attachments";
import { formatTaskGrade } from "@/lib/format/format-task-grade";
import type { StudentClassTaskDetailForSelf } from "@/types/student-class";

type StudentClassTaskDetailsPanelProps = {
  detail: StudentClassTaskDetailForSelf;
};

export function StudentClassTaskDetailsPanel({
  detail,
}: StudentClassTaskDetailsPanelProps) {
  const { classRow, task, studentTask } = detail;

  const description = task.description?.trim() ?? "";

  // So "back to class" restores the Tasks tab without `?tab=` RSC navigation.
  useEffect(() => {
    writeStudentClassDetailTab(
      classRow.class_id,
      STUDENT_CLASS_DETAIL_TABS.TASKS
    );
  }, [classRow.class_id]);

  return (
    <div className="flex flex-col gap-5 pb-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.STUDENT_CLASSES} prefetch={false}>
              My classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={getStudentClassDetailRoute(classRow.class_id)}
              prefetch={false}
            >
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{task.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_28px_-20px_rgb(42_42_82/0.28)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.35),0_16px_32px_-22px_rgb(0_0_0/0.55)]">
        <div className="flex flex-col @lg/panel:flex-row">
          <aside className="order-1 flex w-full shrink-0 flex-col border-b border-border/60 bg-muted/25 @lg/panel:order-2 @lg/panel:w-[20%] @lg/panel:border-b-0 @lg/panel:border-l">
            <div className="border-b border-border/50 px-4 py-3.5">
              <p className="mb-1 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                Class task
              </p>
              <h2 className="text-base font-semibold tracking-tight break-words">
                {task.title}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {task.session_label?.trim()
                  ? task.session_label
                  : "No session linked"}
              </p>
            </div>

            <dl className="flex flex-col gap-4 p-4">
              <DetailField
                label="Description"
                value={description || "—"}
                valueClassName="whitespace-pre-wrap text-xs leading-relaxed"
              />
              <DetailField
                label="Due date"
                value={
                  task.due_date
                    ? format(new Date(task.due_date), "MMM d, yyyy")
                    : "—"
                }
              />
              <DetailField
                label="Grade"
                value={formatTaskGrade({
                  grade: studentTask?.grade,
                  maxGrade: task.max_grade,
                  isYesNo: task.is_yes_no,
                  emptyLabel: task.is_yes_no ? "—" : `—/${task.max_grade}`,
                })}
                className="tabular-nums"
              />
              <DetailField label="Status">
                {!task.started ? (
                  <span className="inline-flex w-fit rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Not started
                  </span>
                ) : studentTask ? (
                  <StudentTaskStatusBadge status={studentTask.status} />
                ) : (
                  <span className="text-muted-foreground">Not assigned</span>
                )}
              </DetailField>
              <DetailField
                label="Submitted"
                value={
                  studentTask?.submitted_at
                    ? format(new Date(studentTask.submitted_at), "MMM d, yyyy")
                    : "—"
                }
              />
            </dl>
          </aside>

          <div className="order-2 flex min-w-0 flex-1 flex-col gap-5 bg-[linear-gradient(180deg,rgb(255_255_255/0.45)_0%,transparent_7rem)] p-5 pb-10 @lg/panel:order-1 @lg/panel:w-[80%] sm:p-6 sm:pb-12 dark:bg-[linear-gradient(180deg,rgb(255_255_255/0.03)_0%,transparent_7rem)]">
            {task.started ? (
              <TaskAttachmentsSection
                entity={TASK_ATTACHMENT_ENTITIES.CLASS_TASK}
                entityId={task.id}
                attachments={detail.taskAttachments ?? []}
                canMutate={false}
                collapsible={false}
                title="Task files"
                getSignedUrlAction={async () => ({
                  success: false,
                  error: "Unavailable.",
                })}
                getSignedUrlById={getStudentTaskAttachmentSignedUrlForSelfAction}
              />
            ) : null}

            <StudentTaskFiles
              studentTaskId={studentTask?.id ?? null}
              uploads={detail.uploads ?? []}
              started={task.started}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
