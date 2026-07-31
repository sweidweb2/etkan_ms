"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  BookOpenIcon,
  CalendarIcon,
  CircleDollarSignIcon,
  PencilIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { SemesterStatusBadge } from "@/components/manager/phases/semester-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PHASE_CARD_LIMITS } from "@/lib/constants/manager-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSemesterDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerSemesterRow } from "@/types/manager-phase";

function TruncatedText({
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
    return <span className={className}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className={cn("cursor-default", className)} tabIndex={0} />}
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

type PhaseCardProps = {
  phase: ManagerSemesterRow;
  onEdit?: (phase: ManagerSemesterRow) => void;
};

export function PhaseCard({ phase, onEdit }: PhaseCardProps) {
  const href = getManagerSemesterDetailRoute(phase.id);
  const startDateLabel = phase.start_date
    ? format(new Date(`${phase.start_date}T00:00:00`), "MMM d, yyyy")
    : "—";

  return (
    <Link
      href={href}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
      aria-label={`View semester ${phase.name}`}
    >
      <TooltipProvider>
        <Card className="h-full py-0 transition-shadow hover:shadow-[0_0_0_3px_rgba(147,197,253,0.35),0_12px_28px_rgba(59,130,246,0.22)]">
          <CardHeader className="border-b bg-muted/30 py-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="min-w-0 flex-1 text-base">
                <TruncatedText
                  value={phase.name}
                  maxLength={PHASE_CARD_LIMITS.name}
                  className="block"
                />
              </CardTitle>
              <div className="flex shrink-0 items-center gap-1.5">
                {onEdit ? (
                  <Can permission={PERMISSIONS.SEMESTERS_UPDATE}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-8"
                      aria-label={`Edit semester ${phase.name}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onEdit(phase);
                      }}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                  </Can>
                ) : null}
                <SemesterStatusBadge status={phase.status} className="shrink-0" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 px-4 pt-2 pb-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="mt-1 font-semibold tabular-nums">${phase.amount}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Courses</p>
                <p className="mt-1 font-semibold">{phase.nb_courses}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Semester code</p>
                <p className="mt-1 font-semibold tabular-nums tracking-wider">
                  {phase.semester_code}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Start date</p>
                <p className="mt-1 font-semibold">{startDateLabel}</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="mt-auto grid grid-cols-1 gap-2 bg-muted/20 py-3 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1.5">
              <BookOpenIcon className="size-3.5" />
              {phase.nb_courses} course
              {phase.nb_courses === 1 ? "" : "s"} in semester
            </div>
            <div className="inline-flex items-center gap-1.5">
              <CircleDollarSignIcon className="size-3.5" />
              ${phase.amount} semester amount
            </div>
            <div className="inline-flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" />
              Starts {startDateLabel}
            </div>
          </CardFooter>
        </Card>
      </TooltipProvider>
    </Link>
  );
}
