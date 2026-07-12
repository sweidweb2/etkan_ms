"use client";

import { SemesterProgressRowCard } from "@/components/manager/phases/semester-progress-row-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ROUTES } from "@/lib/constants/routes";
import type { ManagerSemesterProgressRow } from "@/types/manager-phase";

type SemesterProgressTrackPanelProps = {
  rows: ManagerSemesterProgressRow[];
};

export function SemesterProgressTrackPanel({
  rows,
}: SemesterProgressTrackPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_SEMESTERS}>
              Manage semesters
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Progress track</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress track</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Session progress across all semesters and their linked classes.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          No semesters yet. Add a semester to start tracking progress.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <SemesterProgressRowCard key={row.semester.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
