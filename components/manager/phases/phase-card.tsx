"use client";

import Link from "next/link";
import { BookOpenIcon, CircleDollarSignIcon } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PHASE_CARD_LIMITS } from "@/lib/constants/manager-phase-display";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerSemesterRow } from "@/types/manager-phase";
import { getManagerSemesterDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

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

export function PhaseCard({ phase }: { phase: ManagerSemesterRow }) {
  const href = getManagerSemesterDetailRoute(phase.id);

  return (
    <Link
      href={href}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
      aria-label={`View semester ${phase.name}`}
    >
      <TooltipProvider>
        <Card className="h-full py-0 transition-shadow hover:shadow-[0_0_0_3px_rgba(147,197,253,0.35),0_12px_28px_rgba(59,130,246,0.22)]">
          <CardHeader className="border-b bg-muted/30 py-4">
            <CardTitle className="text-base">
              <TruncatedText
                value={phase.name}
                maxLength={PHASE_CARD_LIMITS.name}
                className="block"
              />
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 px-4 py-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="mt-1 font-semibold tabular-nums">${phase.amount}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Courses</p>
                <p className="mt-1 font-semibold">{phase.nb_courses}</p>
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
              Preview-only semester pricing
            </div>
          </CardFooter>
        </Card>
      </TooltipProvider>
    </Link>
  );
}
