"use client";

import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_ICON_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-class-display";
import type { ClassStatusValue } from "@/lib/constants/manager-class-status";
import { getStudentClassDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";

type StudentClassesPanelProps = {
  rows: ManagerStudentClassRow[];
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

export function StudentClassesPanel({ rows }: StudentClassesPanelProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Classes you are enrolled in. Open a card to view details.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          You are not enrolled in any classes yet.
        </div>
      ) : (
        <div className="grid w-full justify-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),15rem))]">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={getStudentClassDetailRoute(row.class_id)}
              prefetch={false}
              aria-label={`View details for ${row.name}`}
              className="group relative flex min-h-56 flex-col overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-foreground/10 shadow-[0_16px_36px_-24px_rgb(42_42_82/0.65)] outline-none transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_22px_40px_-20px_rgb(42_42_82/0.5)] hover:ring-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50"
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
                  {row.image_url ? (
                    <img
                      src={row.image_url}
                      alt={row.name}
                      className="size-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex size-12 items-center justify-center rounded-2xl text-sm font-semibold tracking-wide",
                        MANAGER_CLASS_STATUS_ICON_CLASSES[row.class_status]
                      )}
                    >
                      {subjectMark(row.subject_name)}
                    </span>
                  )}
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

                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                  <p className="text-xs text-muted-foreground">
                    Joined {format(new Date(row.joined_at), "MMM d, yyyy")}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    View class
                    <ArrowUpRight
                      className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden
                    />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
