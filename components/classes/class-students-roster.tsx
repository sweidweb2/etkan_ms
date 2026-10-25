"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CLASS_STUDENT_TABLE_LIMITS } from "@/lib/constants/manager-class-student-display";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ClassStudentRow } from "@/types/class-student";

type ClassStudentsRosterProps = {
  className: string;
  students: ClassStudentRow[];
  /** Visual shell: bordered card (teacher) vs bare (embed in manager). */
  variant?: "card" | "plain";
  /** Teachers omit phone (not loaded in teaching RSC payload). */
  showPhone?: boolean;
  /**
   * Teachers skip Auth Admin emails; show username instead.
   * @default true
   */
  showEmail?: boolean;
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

  return (
    <span
      className={cn("block truncate", className)}
      title={isTruncated ? value : undefined}
    >
      {display}
    </span>
  );
}

function matchesSearch(
  student: ClassStudentRow,
  query: string,
  includePhone: boolean,
  includeEmail: boolean
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    student.full_name,
    student.username ?? "",
    ...(includeEmail ? [student.email] : []),
    ...(includePhone ? [student.phone ?? ""] : []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

/**
 * Read-only enrolled students roster (search + table).
 * Manager manage mode keeps its own actions chrome and embeds this table body
 * or continues to use the fuller ClassStudentsSection.
 */
export function ClassStudentsRoster({
  className,
  students,
  variant = "card",
  showPhone = true,
  showEmail = true,
}: ClassStudentsRosterProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      students.filter((student) =>
        matchesSearch(student, query, showPhone, showEmail)
      ),
    [query, showEmail, showPhone, students]
  );

  const identityLabel = showEmail ? "Email" : "Username";

  const table = (
    <>
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          variant === "card"
            ? "border-b border-border/50 bg-muted/25 px-5 py-4"
            : "mb-3"
        )}
      >
        <div>
          <h2 className="text-base font-semibold tracking-tight">Students</h2>
          <p className="text-sm text-muted-foreground">
            {students.length} enrolled in {className}.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search students…"
            className="pl-8"
            aria-label="Search students"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">{identityLabel}</th>
              {showPhone ? (
                <th className="px-4 py-3 font-medium">Phone</th>
              ) : null}
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={showPhone ? 4 : 3}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {students.length === 0
                    ? "No students enrolled in this class yet."
                    : "No students match your search."}
                </td>
              </tr>
            ) : (
              filtered.map((student) => (
                <tr
                  key={student.id}
                  className="border-b last:border-b-0 hover:bg-muted/30"
                >
                  <td className="max-w-[12rem] px-4 py-3">
                    <TruncatedCell
                      value={student.full_name}
                      maxLength={CLASS_STUDENT_TABLE_LIMITS.fullName}
                      className="font-medium"
                    />
                  </td>
                  <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                    <TruncatedCell
                      value={
                        showEmail
                          ? student.email
                          : (student.username ?? "—")
                      }
                      maxLength={
                        showEmail
                          ? CLASS_STUDENT_TABLE_LIMITS.email
                          : CLASS_STUDENT_TABLE_LIMITS.username
                      }
                    />
                  </td>
                  {showPhone ? (
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {student.phone ?? "—"}
                    </td>
                  ) : null}
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {format(new Date(student.joined_at), "MMM d, yyyy")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  if (variant === "plain") {
    return <section>{table}</section>;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_10px_28px_-24px_rgba(62,62,117,0.18)]">
      {table}
    </section>
  );
}
