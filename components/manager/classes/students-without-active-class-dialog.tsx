"use client";

import Link from "next/link";
import { EyeIcon } from "lucide-react";
import { StudentStatusBadge } from "@/components/manager/students/student-status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getManagerStudentDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerStudentWithoutActiveClassRow } from "@/types/manager-student";

type StudentsWithoutActiveClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: ManagerStudentWithoutActiveClassRow[];
  isLoading: boolean;
};

function TruncatedCell({
  value,
  maxLength,
}: {
  value: string;
  maxLength: number;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  return (
    <span className="block truncate" title={isTruncated ? value : undefined}>
      {display}
    </span>
  );
}

export function StudentsWithoutActiveClassDialog({
  open,
  onOpenChange,
  students,
  isLoading,
}: StudentsWithoutActiveClassDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Students without an active class</DialogTitle>
          <DialogDescription>
            Students who are not enrolled in any in-progress class.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted text-left">
              <tr className="border-b">
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 text-right font-medium">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Loading students…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-muted-foreground"
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
                    <td className="max-w-40 px-3 py-2 font-medium">
                      <TruncatedCell value={row.full_name} maxLength={28} />
                    </td>
                    <td className="px-3 py-2">
                      <StudentStatusBadge status={row.status} />
                    </td>
                    <td className="max-w-32 px-3 py-2 text-muted-foreground">
                      {row.phone ? (
                        <TruncatedCell value={row.phone} maxLength={18} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <Link
                          href={getManagerStudentDetailRoute(
                            row.student_profile_id
                          )}
                          prefetch={false}
                          aria-label={`View ${row.full_name}`}
                          className={cn(
                            buttonVariants({ size: "icon-sm", variant: "outline" })
                          )}
                        >
                          <EyeIcon />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
