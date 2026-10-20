import { format } from "date-fns";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_ICON_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-class-display";
import type { ClassStatusValue } from "@/lib/constants/manager-class-status";
import { cn } from "@/lib/utils";
import type { TeacherClassRow } from "@/types/teacher-class";

type TeacherClassesPanelProps = {
  rows: TeacherClassRow[];
};

const STATUS_WASH: Record<ClassStatusValue, string> = {
  scheduled: "from-violet-500/25",
  in_progress: "from-sky-500/25",
  done: "from-emerald-500/25",
  paused: "from-amber-500/25",
  stopped: "from-rose-500/20",
};

function subjectMark(subjectName: string) {
  const letters = subjectName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return letters || "CL";
}

export function TeacherClassesPanel({ rows }: TeacherClassesPanelProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Classes you are teaching.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          You are not teaching any classes yet.
        </div>
      ) : (
        <div className="grid w-full justify-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),15rem))]">
          {rows.map((row) => (
            <article
              key={row.id}
              className="relative flex min-h-56 flex-col overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-foreground/10 shadow-[0_16px_36px_-24px_rgb(42_42_82/0.65)]"
            >
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b to-transparent",
                  STATUS_WASH[row.class_status]
                )}
              />
              <div className="relative flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl text-sm font-semibold tracking-wide",
                      MANAGER_CLASS_STATUS_ICON_CLASSES[row.class_status]
                    )}
                  >
                    {subjectMark(row.subject_name)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                      MANAGER_CLASS_STATUS_BADGE_CLASSES[row.class_status]
                    )}
                  >
                    {MANAGER_CLASS_STATUS_LABELS[row.class_status]}
                  </span>
                </div>

                <div className="mt-8">
                  <h2 className="text-xl font-semibold tracking-tight text-balance">
                    {row.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.subject_name}
                  </p>
                </div>

                <p className="mt-auto pt-6 text-xs text-muted-foreground">
                  {row.assigned_at
                    ? `Assigned ${format(new Date(row.assigned_at), "MMM d, yyyy")}`
                    : "Assigned"}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
