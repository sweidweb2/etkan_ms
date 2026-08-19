"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddSemesterStudentDialog } from "@/components/manager/phases/add-semester-student-dialog";
import { StudentSemesterStatusBadge } from "@/components/manager/students/student-semester-status-badge";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MANAGER_STUDENT_SEMESTER_TABLE_LIMITS } from "@/lib/constants/manager-student-semester-display";
import { STUDENT_SEMESTER_STATUSES } from "@/lib/constants/manager-student-semester-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { ManagerStudentSemesterRow } from "@/types/manager-student-semester";

type SemesterStudentsSectionProps = {
  semesterId: string;
  semesterName: string;
  initialStudents: ManagerStudentSemesterRow[];
  initialAvailableStudents: ManagerStudentRow[];
  onStudentsChanged: (
    enrollment: ManagerStudentSemesterRow,
    studentProfileId: string
  ) => void;
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

function matchesSearch(row: ManagerStudentSemesterRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [row.full_name, row.email, row.phone ?? "", row.status]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function SemesterStudentsSection({
  semesterId,
  semesterName,
  initialStudents,
  initialAvailableStudents,
  onStudentsChanged,
}: SemesterStudentsSectionProps) {
  const students = initialStudents;
  const availableStudents = initialAvailableStudents;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const stats = useMemo(
    () => ({
      total: students.length,
      active: students.filter((row) => row.status === STUDENT_SEMESTER_STATUSES.ACTIVE)
        .length,
      pending: students.filter((row) => row.status === STUDENT_SEMESTER_STATUSES.PENDING)
        .length,
      onHold: students.filter(
        (row) =>
          row.status === STUDENT_SEMESTER_STATUSES.INACTIVE ||
          row.status === STUDENT_SEMESTER_STATUSES.WITHDRAWN
      ).length,
    }),
    [students]
  );

  const filteredStudents = useMemo(
    () => students.filter((row) => matchesSearch(row, searchQuery)),
    [searchQuery, students]
  );

  return (
    <TooltipProvider>
      <AddSemesterStudentDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        semesterId={semesterId}
        semesterName={semesterName}
        availableStudents={availableStudents}
        onStudentAdded={onStudentsChanged}
      />

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <div>
            <CardTitle>Semester students</CardTitle>
            <p className="text-sm text-muted-foreground">
              Students enrolled in {semesterName} for access tracking
              tracking.
            </p>
          </div>
          <CardAction className="self-center">
            <Can permission={PERMISSIONS.SEMESTERS_ADD_STUDENT}>
              <Button type="button" onClick={() => setIsAddOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Add student
              </Button>
            </Can>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 px-4 pt-3 pb-3">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <UserStatCard
              label="Total enrolled"
              value={stats.total}
              accentClassName="border-l-sky-500"
            />
            <UserStatCard
              label="Active"
              value={stats.active}
              accentClassName="border-l-emerald-500"
            />
            <UserStatCard
              label="Pending"
              value={stats.pending}
              accentClassName="border-l-amber-500"
            />
            <UserStatCard
              label="On hold"
              value={stats.onHold}
              accentClassName="border-l-rose-500"
            />
          </div>

          <div className="relative min-w-0">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search student name, email, or status…"
              className="pl-8"
              aria-label="Search semester students"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {students.length === 0
                        ? "No students enrolled in this semester yet."
                        : "No students match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <td className="max-w-[12rem] px-4 py-3">
                        <TruncatedCell
                          value={row.full_name}
                          maxLength={MANAGER_STUDENT_SEMESTER_TABLE_LIMITS.fullName}
                          className="font-medium"
                        />
                      </td>
                      <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                        <TruncatedCell
                          value={row.email}
                          maxLength={MANAGER_STUDENT_SEMESTER_TABLE_LIMITS.email}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StudentSemesterStatusBadge status={row.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {format(new Date(row.created_at), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
