"use client";

import Link from "next/link";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-class-display";
import { getStudentClassDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";

type StudentClassesPanelProps = {
  rows: ManagerStudentClassRow[];
};

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
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={getStudentClassDetailRoute(row.class_id)}
              prefetch={false}
              aria-label={`View details for ${row.name}`}
              className="flex flex-col gap-3 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 shadow-[0_12px_28px_-20px_rgb(42_42_82/0.55)] outline-none transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-18px_rgb(42_42_82/0.45)] hover:ring-primary/35 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold tracking-tight">
                  {row.name}
                </h2>
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                    MANAGER_CLASS_STATUS_BADGE_CLASSES[row.class_status]
                  )}
                >
                  {MANAGER_CLASS_STATUS_LABELS[row.class_status]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{row.subject_name}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
