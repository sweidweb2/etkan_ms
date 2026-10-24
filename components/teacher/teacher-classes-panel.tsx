"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { GradientGlassCard } from "@/components/ui/gradient-glass-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_DOT_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-class-display";
import {
  CLASS_STATUS_VALUES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import { getTeacherClassDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { TeacherClassRow } from "@/types/class-teaching";

type TeacherClassesPanelProps = {
  rows: TeacherClassRow[];
};

const STATUS_FILTER_ALL = "all";

function matchesSearch(row: TeacherClassRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    row.name,
    row.subject_name,
    MANAGER_CLASS_STATUS_LABELS[row.class_status],
    row.class_status,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function TeacherClassesPanel({ rows }: TeacherClassesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL || row.class_status === statusFilter;
      return matchesStatus && matchesSearch(row, searchQuery);
    });
  }, [rows, searchQuery, statusFilter]);

  const hasFilters =
    searchQuery.trim().length > 0 || statusFilter !== STATUS_FILTER_ALL;

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Classes you are teaching. Open a card to view sessions and tasks.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          You are not teaching any classes yet.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by class or subject…"
                className="pl-8"
                aria-label="Search classes"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value ?? STATUS_FILTER_ALL)
              }
            >
              <SelectTrigger
                className="w-full sm:w-44"
                aria-label="Filter by status"
              >
                <SelectValue placeholder="Status">
                  {(value) =>
                    !value || value === STATUS_FILTER_ALL
                      ? "All statuses"
                      : (MANAGER_CLASS_STATUS_LABELS[
                          value as ClassStatusValue
                        ] ?? String(value))
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                {CLASS_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {MANAGER_CLASS_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
              {hasFilters
                ? "No classes match your filters."
                : "You are not teaching any classes yet."}
            </div>
          ) : (
            <div className="grid w-full justify-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,16.5rem),16.5rem))]">
              {filteredRows.map((row) => (
                <Link
                  key={row.id}
                  href={getTeacherClassDetailRoute(row.id)}
                  prefetch={false}
                  aria-label={`View details for ${row.name}`}
                  className="block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <GradientGlassCard
                    id={row.id}
                    cardGradient={row.card_gradient}
                    title={row.name}
                    glassLabel={row.subject_name}
                    badge={
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          MANAGER_CLASS_STATUS_BADGE_CLASSES[row.class_status]
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            MANAGER_CLASS_STATUS_DOT_CLASSES[row.class_status]
                          )}
                          aria-hidden
                        />
                        {MANAGER_CLASS_STATUS_LABELS[row.class_status]}
                      </span>
                    }
                    meta={
                      row.assigned_at
                        ? `Assigned ${format(new Date(row.assigned_at), "MMM d, yyyy")}`
                        : "Assigned"
                    }
                  />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
