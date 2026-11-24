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
    <aside className="flex w-full shrink-0 flex-col border-b border-border/60 bg-muted/25 @2xl/panel:w-72 @2xl/panel:border-r @2xl/panel:border-b-0">
      <div className="border-b border-border/50 px-4 py-3.5">
        <h3 className="text-sm font-semibold tracking-tight">Students</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {students.length} student{students.length === 1 ? "" : "s"}
        </p>
      </div>
      <ul
        className="flex max-h-56 flex-col gap-1 overflow-y-auto p-2.5 @2xl/panel:max-h-[min(36rem,70vh)]"
        role="listbox"
        aria-label="Students"
      >
        {students.map((row, index) => {
          const isSelected = row.id === selectedId;
          return (
            <li key={row.id}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelect(row.id)}
                className={cn(
                  "relative flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-[background-color,box-shadow,color] duration-150",
                  isSelected
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                    : "text-foreground/90 hover:bg-background/70"
                )}
              >
                {isSelected ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
                  />
                ) : null}
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums",
                    isSelected
                      ? "bg-primary/12 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium leading-snug">
                    {row.full_name}
                  </span>
                  <span className="mt-1.5 block">
                    <StudentTaskStatusBadge
                      status={row.status}
                      className="w-fit shrink-0 px-1.5 py-0 text-[10px] leading-4"
                    />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
