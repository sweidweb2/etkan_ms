"use client";

import Link from "next/link";
import { SemesterClassesProgressTrack } from "@/components/manager/phases/semester-classes-progress-track";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSemesterSessionProgressSummary } from "@/lib/constants/manager-semester-class-progress";
import { getManagerSemesterDetailRoute } from "@/lib/constants/routes";
import type { ManagerSemesterProgressRow } from "@/types/manager-phase";

type SemesterProgressRowCardProps = {
  row: ManagerSemesterProgressRow;
};

export function SemesterProgressRowCard({ row }: SemesterProgressRowCardProps) {
  const { semester, classes } = row;
  const summary = getSemesterSessionProgressSummary(classes);
  const detailHref = getManagerSemesterDetailRoute(semester.id);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="gap-3 border-b bg-muted/20 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base leading-snug">
            <Link
              href={detailHref}
              className="hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {semester.name}
            </Link>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.classCount}{" "}
            {summary.classCount === 1 ? "linked class" : "linked classes"}
            {summary.classCount > 0
              ? ` · ${summary.completedSessions}/${summary.totalSessions} sessions`
              : null}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {summary.overallRate}%
          </p>
          <p className="text-xs text-muted-foreground">Overall completion</p>
        </div>
      </CardHeader>

      <CardContent className="py-4">
        {classes.length > 0 ? (
          <SemesterClassesProgressTrack
            classes={classes}
            semesterName={semester.name}
          />
        ) : (
          <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No linked classes yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
