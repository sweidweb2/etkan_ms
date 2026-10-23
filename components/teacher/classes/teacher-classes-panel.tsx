"use client";

import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-class-display";
import { getTeacherClassDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerClassRow } from "@/types/manager-class-list";

type TeacherClassesPanelProps = {
  rows: ManagerClassRow[];
};

const CLASS_ROW_CLASS =
  "cursor-pointer transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)] active:bg-primary/15 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

export function TeacherClassesPanel({ rows }: TeacherClassesPanelProps) {
  const router = useRouter();

  const openClassDetails = (classId: string) => {
    router.push(getTeacherClassDetailRoute(classId));
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    classId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openClassDetails(classId);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Classes you are assigned to teach. Select a row to view details and
          students.
        </p>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Assigned classes</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Class</TableHead>
                <TableHead className="px-4">Subject</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4 text-right">Students</TableHead>
                <TableHead className="px-4 text-right">Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="h-24 px-4 text-center text-muted-foreground whitespace-normal"
                  >
                    You are not assigned to any classes yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(CLASS_ROW_CLASS)}
                    tabIndex={0}
                    role="link"
                    aria-label={`View details for ${row.name}`}
                    onClick={() => openClassDetails(row.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, row.id)}
                  >
                    <TableCell className="px-4 font-medium whitespace-normal">
                      {row.name}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground whitespace-normal">
                      {row.subject_name}
                    </TableCell>
                    <TableCell className="px-4">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                          MANAGER_CLASS_STATUS_BADGE_CLASSES[row.status]
                        )}
                      >
                        {MANAGER_CLASS_STATUS_LABELS[row.status]}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-right tabular-nums text-muted-foreground">
                      {row.enrollment_count}
                    </TableCell>
                    <TableCell className="px-4 text-right tabular-nums text-muted-foreground">
                      {row.completed_sessions}
                      {row.subject_nb_sessions > 0
                        ? ` / ${row.subject_nb_sessions}`
                        : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
