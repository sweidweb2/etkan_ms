"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import { SESSION_TASK_TABLE_LIMITS } from "@/lib/constants/manager-class-session-detail-display";
import { getManagerClassSessionTaskDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerClassTaskRow } from "@/types/manager-class-session-detail";

type ClassSessionTasksSectionProps = {
  classId: string;
  className: string;
  tasks: ManagerClassTaskRow[];
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

function formatDateCell(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy");
}

function formatDateTimeCell(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

function formatSessionLabel(task: ManagerClassTaskRow) {
  if (!task.session_nb_order && !task.session_topic) {
    return "—";
  }

  return `S${task.session_nb_order} · ${task.session_topic}`;
}

export function ClassSessionTasksSection({
  classId,
  className,
  tasks,
}: ClassSessionTasksSectionProps) {
  const router = useRouter();

  const handleOpenTask = (task: ManagerClassTaskRow) => {
    router.push(
      getManagerClassSessionTaskDetailRoute(classId, task.session_id, task.id)
    );
  };

  return (
    <ClassTabCollapsibleSection
      title="Tasks"
      description={`All tasks from sessions in ${className}.`}
      storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.CLASS_DETAILS_TASKS}
      defaultOpen
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Session</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Due date</th>
              <th className="px-4 py-3 font-medium">Max grade</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No tasks linked to this class yet.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  className="cursor-pointer border-b last:border-b-0 transition-colors duration-150 hover:bg-primary/8 hover:shadow-[inset_3px_0_0_0_var(--primary)] active:bg-primary/12"
                  onClick={() => handleOpenTask(task)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenTask(task);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`View task ${task.title}`}
                >
                  <td className="max-w-[12rem] px-4 py-3">
                    <TruncatedCell
                      value={task.title}
                      maxLength={SESSION_TASK_TABLE_LIMITS.title}
                      className="font-medium"
                    />
                  </td>
                  <td className="max-w-[12rem] px-4 py-3 text-muted-foreground">
                    <TruncatedCell
                      value={formatSessionLabel(task)}
                      maxLength={SESSION_TASK_TABLE_LIMITS.session}
                    />
                  </td>
                  <td className="max-w-[16rem] px-4 py-3 text-muted-foreground">
                    <TruncatedCell
                      value={task.description ?? "—"}
                      maxLength={SESSION_TASK_TABLE_LIMITS.description}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDateCell(task.due_date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {task.max_grade ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDateTimeCell(task.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ClassTabCollapsibleSection>
  );
}
