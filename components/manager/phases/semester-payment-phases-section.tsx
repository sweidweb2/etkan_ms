"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { getManagerAccountingPhaseDetailRoute } from "@/lib/constants/routes";
import {
  PAYMENT_PHASE_STATUSES,
  type PaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import type { ManagerSemesterPaymentPhaseRow } from "@/types/manager-semester-payment-phase";

function asPaymentPhaseStatus(value: string): PaymentPhaseStatus | null {
  if (
    value === PAYMENT_PHASE_STATUSES.OPENED ||
    value === PAYMENT_PHASE_STATUSES.CLOSED ||
    value === PAYMENT_PHASE_STATUSES.CANCELLED
  ) {
    return value;
  }
  return null;
}

const PAGE_SIZE = 6;

type SemesterPaymentPhasesSectionProps = {
  semesterName: string;
  initialPhases: ManagerSemesterPaymentPhaseRow[];
};

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage !== undefined && page - previousPage > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });

  return result;
}

export function SemesterPaymentPhasesSection({
  semesterName,
  initialPhases,
}: SemesterPaymentPhasesSectionProps) {
  const [phases, setPhases] = useState(initialPhases);
  const [prevPhases, setPrevPhases] = useState(initialPhases);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  if (initialPhases !== prevPhases) {
    setPrevPhases(initialPhases);
    setPhases(initialPhases);
  }

  const filteredPhases = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return phases;
    }

    return phases.filter((row) => {
      const haystack = [row.name, row.status, row.semester_code]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [phases, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPhases.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPhases = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredPhases.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPhases, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredPhases.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safeCurrentPage * PAGE_SIZE, filteredPhases.length);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 py-3">
        <CardTitle>Payment phases</CardTitle>
        <CardDescription>
          Payment phases for {semesterName}. Manage them from Accounting.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4 pb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <UserStatCard
            label="Payment phases"
            value={phases.length}
            accentClassName="border-l-violet-500"
          />
          <UserStatCard
            label="Showing"
            value={filteredPhases.length}
            accentClassName="border-l-amber-500"
          />
        </div>

        <div className="relative min-w-0">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search payment phases..."
            className="pl-8"
            aria-label="Search payment phases"
          />
        </div>

        {paginatedPhases.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No payment phases for this semester.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium">Dates</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPhases.map((phase) => {
                  const status = asPaymentPhaseStatus(phase.status);

                  return (
                    <tr key={phase.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={getManagerAccountingPhaseDetailRoute(phase.id)}
                          className="text-primary hover:underline"
                          prefetch={false}
                        >
                          {phase.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {status ? (
                          <PaymentPhaseStatusBadge status={status} />
                        ) : (
                          phase.status
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatPaymentPhaseMoney(phase.amount)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(phase.start_date), "MMM d, yyyy")} –{" "}
                        {format(new Date(phase.end_date), "MMM d, yyyy")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {filteredPhases.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </Button>
            {pageNumbers.map((page, index) =>
              page === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1 text-sm text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <Button
                  key={page}
                  type="button"
                  variant={page === safeCurrentPage ? "default" : "outline"}
                  size="icon-sm"
                  className="min-w-7"
                  onClick={() => setCurrentPage(page)}
                  aria-label={`Page ${page}`}
                  aria-current={page === safeCurrentPage ? "page" : undefined}
                >
                  {page}
                </Button>
              )
            )}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
