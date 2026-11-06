"use client";

import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { cn } from "@/lib/utils";
import type { ManagerStudentTaskRow } from "@/types/manager-class-session-detail";

type StudentTaskListProps = {
  students: ManagerStudentTaskRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Compact student sidebar for the shared task workspace. */
export function StudentTaskList({
  students,
  selectedId,
  onSelect,
}: StudentTaskListProps) {
  return (
    <aside className="w-full shrink-0 border-b border-border/60 @2xl/panel:w-48 lg:border-r lg:border-b-0 @4xl/panel:w-52">
      <ul
        className="flex gap-1.5 overflow-x-auto p-3 lg:max-h-[min(70vh,40rem)] @2xl/panel:flex-col lg:overflow-y-auto"
        role="listbox"
        aria-label="Students"
      >
        {students.map((row) => {
          const isSelected = row.id === selectedId;
          return (
            <li
              key={row.id}
              className="min-w-[9.5rem] shrink-0 @2xl/panel:min-w-0 @2xl/panel:w-full"
            >
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelect(row.id)}
                className={cn(
                  "flex w-full flex-col items-start gap-1.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  isSelected
                    ? "bg-background text-primary shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span className="w-full truncate text-xs font-medium text-foreground">
                  {row.full_name}
                </span>
                <StudentTaskStatusBadge
                  status={row.status}
                  className="w-fit shrink-0 px-1.5 py-0 text-[10px] leading-4"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
