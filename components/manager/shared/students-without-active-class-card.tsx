"use client";

import Link from "next/link";
import { EyeIcon } from "lucide-react";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { StudentStatusBadge } from "@/components/manager/students/student-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { getManagerStudentDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerStudentWithoutActiveClassRow } from "@/types/manager-student";

type StudentsWithoutActiveClassCardProps = {
  students: ManagerStudentWithoutActiveClassRow[];
  description?: string;
  storageKey?: string;
  defaultOpen?: boolean;
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
    <span className={cn("block truncate", className)} title={value}>
      {display}
    </span>
  );
}

export function StudentsWithoutActiveClassCard({
  students,
  description = "Students who are not enrolled in any in-progress class.",
  storageKey,
  defaultOpen = true,
}: StudentsWithoutActiveClassCardProps) {
  return (
    <ClassTabCollapsibleSection
      title="Students without an active class"
      description={description}
      storageKey={storageKey}
      defaultOpen={defaultOpen}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Every student is enrolled in an in-progress class.
                </td>
              </tr>
            ) : (
              students.map((row) => (
                <tr
                  key={row.user_id}
                  className="border-b last:border-b-0 hover:bg-muted/30"
                >
                  <td className="max-w-[16rem] px-4 py-3 font-medium">
                    <TruncatedCell value={row.full_name} maxLength={36} />
                  </td>
                  <td className="px-4 py-3">
                    <StudentStatusBadge status={row.status} />
                  </td>
                  <td className="max-w-[12rem] px-4 py-3 text-muted-foreground">
                    {row.phone ? (
                      <TruncatedCell value={row.phone} maxLength={24} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Link
                        href={getManagerStudentDetailRoute(
                          row.student_profile_id
                        )}
                        className={cn(
                          buttonVariants({ size: "sm", variant: "outline" })
                        )}
                      >
                        <EyeIcon data-icon="inline-start" />
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ClassTabCollapsibleSection>
  );
}
