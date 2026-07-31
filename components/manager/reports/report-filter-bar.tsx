"use client";

import { SearchIcon } from "lucide-react";
import { MANAGER_CLASSES_MOCK } from "@/lib/constants/manager-classes-mock";
import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import {
  ANALYTICS_PERIOD_OPTIONS,
  AUDIT_TABLE_OPTIONS,
} from "@/lib/constants/manager-reports-mock";
import { STUDENT_STATUS_VALUES } from "@/lib/constants/manager-student-status";
import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import { MANAGER_USERS_MOCK } from "@/lib/constants/manager-users-mock";
import { ROLES } from "@/lib/constants/roles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalyticsPeriod } from "@/types/manager-analytics";
import type { ReportFilterKey, ReportFilters } from "@/types/manager-reports";
import { cn } from "@/lib/utils";

type ReportFilterBarProps = {
  filterKeys: ReportFilterKey[];
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  className?: string;
};

const SUBSCRIPTION_STATUS_OPTIONS = ["active", "inactive"] as const;

const GRANULARITY_OPTIONS = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "semester", label: "By semester" },
] as const;

export function ReportFilterBar({
  filterKeys,
  filters,
  onFiltersChange,
  className,
}: ReportFilterBarProps) {
  const update = (patch: Partial<ReportFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const auditUsers = MANAGER_USERS_MOCK.filter(
    (user) =>
      user.role === ROLES.MANAGER ||
      user.role === ROLES.TEACHER ||
      user.role === ROLES.ADMIN
  );

  const studentSelectItems = MANAGER_STUDENTS_MOCK.map((student) => ({
    value: student.student_profile_id,
    label: student.full_name,
  }));

  const userSelectItems = [
    { value: "all", label: "All users" },
    ...auditUsers.map((user) => ({
      value: user.id,
      label: user.username ?? user.email,
    })),
  ];

  if (filterKeys.length === 0) {
    return (
      <Card
        className={cn("flex h-full flex-col py-0 print:hidden", className)}
      >
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle className="text-base">Report filters</CardTitle>
          <CardDescription>No filters for this report.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center px-4 pt-2 pb-3">
          <p className="text-sm text-muted-foreground">
            This report uses the full preview dataset.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex h-full flex-col py-0 print:hidden", className)}>
      <CardHeader className="border-b bg-muted/40 py-3">
        <CardTitle className="text-base">Report filters</CardTitle>
        <CardDescription>
          Narrow the preview before exporting or printing.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid flex-1 grid-cols-2 gap-3 px-4 pt-2 pb-3">
        {filterKeys.includes("period") ? (
          <Select
            value={filters.period}
            onValueChange={(value) =>
              update({ period: (value ?? "30d") as AnalyticsPeriod })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {ANALYTICS_PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {filterKeys.includes("semester") ? (
          <Select
            value={filters.semesterId}
            onValueChange={(value) => update({ semesterId: value ?? "all" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All semesters</SelectItem>
              {MANAGER_PHASES_MOCK.map((semester) => (
                <SelectItem key={semester.id} value={semester.id}>
                  {semester.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {filterKeys.includes("class") ? (
          <Select
            value={filters.classId}
            onValueChange={(value) => update({ classId: value ?? "all" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              {MANAGER_CLASSES_MOCK.map((cls) => (
                <SelectItem key={cls.class_id} value={cls.class_id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {filterKeys.includes("student") ? (
          <Select
            value={filters.studentId}
            items={studentSelectItems}
            onValueChange={(value) => update({ studentId: value ?? "all" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Student" />
            </SelectTrigger>
            <SelectContent>
              {MANAGER_STUDENTS_MOCK.map((student) => (
                <SelectItem
                  key={student.student_profile_id}
                  value={student.student_profile_id}
                >
                  {student.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {filterKeys.includes("status") ? (
          <Select
            value={filters.status}
            onValueChange={(value) => update({ status: value ?? "all" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STUDENT_STATUS_VALUES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
              {SUBSCRIPTION_STATUS_OPTIONS.map((status) => (
                <SelectItem key={`sub-${status}`} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {filterKeys.includes("user") ? (
          <Select
            value={filters.userId}
            items={userSelectItems}
            onValueChange={(value) => update({ userId: value ?? "all" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {auditUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {filterKeys.includes("table") ? (
          <Select
            value={filters.tableName}
            onValueChange={(value) => update({ tableName: value ?? "all" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Table" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tables</SelectItem>
              {AUDIT_TABLE_OPTIONS.map((table) => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {filterKeys.includes("granularity") ? (
          <Select
            value={filters.granularity}
            onValueChange={(value) =>
              update({
                granularity: (value ?? "month") as ReportFilters["granularity"],
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Granularity" />
            </SelectTrigger>
            <SelectContent>
              {GRANULARITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {filterKeys.includes("search") ? (
          <div className="relative col-span-2 w-full">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search contacts..."
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
