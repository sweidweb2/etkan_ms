"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarIcon, ClockIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CLASS_SESSION_CARD_LIMITS,
  SESSION_TIMING_BADGE_CLASSES,
  SESSION_TIMING_LABELS,
} from "@/lib/constants/manager-class-session-display";
import { getManagerClassSessionDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import {
  getSessionTimingLabel,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";

type ClassSessionCardProps = {
  session: ManagerClassSessionRow;
  classId: string;
  className?: string;
};

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
        render={
          <span className={cn("cursor-default truncate", className)} tabIndex={0} />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

export function ClassSessionCard({
  session,
  classId,
  className,
}: ClassSessionCardProps) {
  const timingLabel = getSessionTimingLabel(session);
  const timingText = SESSION_TIMING_LABELS[timingLabel];
  const timingClassName =
    SESSION_TIMING_BADGE_CLASSES[timingLabel] ??
    "bg-muted text-muted-foreground";
  const startsAt = new Date(session.starts_at);
  const endsAt = new Date(session.ends_at);
  const spansMultipleDays =
    format(startsAt, "yyyy-MM-dd") !== format(endsAt, "yyyy-MM-dd");

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "group relative w-[17rem] shrink-0 gap-0 py-0 transition-shadow hover:border-emerald-400/45 hover:shadow-[0_12px_32px_rgba(16,185,129,0.18)]",
          className
        )}
      >
        <Link
          href={getManagerClassSessionDetailRoute(classId, session.id)}
          aria-label={`View session S${session.nb_order}: ${session.topic}`}
          className="absolute inset-0 z-0 rounded-xl"
        />
        <CardHeader className="pointer-events-none relative z-10 gap-2 border-b bg-muted/20 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                S{session.nb_order}
              </p>
              <CardTitle className="mt-0.5 text-sm leading-snug">
                <TruncatedText
                  value={session.topic}
                  maxLength={CLASS_SESSION_CARD_LIMITS.topic}
                />
              </CardTitle>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize",
                timingClassName
              )}
            >
              {timingText}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pointer-events-none relative z-10 flex flex-col gap-2.5 py-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="size-3.5 shrink-0" />
            <span className="text-foreground">
              {format(startsAt, "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClockIcon className="size-3.5 shrink-0" />
            <span className="text-foreground">
              {format(startsAt, "h:mm a")} – {format(endsAt, "h:mm a")}
            </span>
          </div>
          {spansMultipleDays ? (
            <div className="text-muted-foreground">
              <span className="shrink-0">Ends </span>
              <span className="text-foreground">
                {format(endsAt, "MMM d, yyyy")}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
