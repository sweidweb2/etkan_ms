"use client";

import { format } from "date-fns";
import { CalendarOffIcon, RotateCcwIcon } from "lucide-react";
import { unskipClassWeekAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import type {
  ClassWeekSlot,
  UnskipClassWeekActionState,
} from "@/types/manager-class-week-skip";

const unskipInitialState: UnskipClassWeekActionState = {};

/** "Sat, Nov 14" from a YYYY-MM-DD skip key. */
export function formatClassWeekDate(isoDate: string): string {
  return format(new Date(`${isoDate}T12:00:00`), "EEE, MMM d");
}

function UnskipWeekButton({
  classId,
  week,
  onRestored,
}: {
  classId: string;
  week: ClassWeekSlot;
  onRestored: (state: UnskipClassWeekActionState) => void;
}) {
  const [state, formAction, isPending] = useFormActionState(
    unskipClassWeekAction,
    unskipInitialState
  );

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, onRestored);

  function handleClick() {
    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("skip_date", week.date);
    formAction(formData);
  }

  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
      disabled={isPending}
      onClick={handleClick}
      aria-label={`Restore the week of ${formatClassWeekDate(week.date)}`}
    >
      {isPending ? <InlineSpinner /> : <RotateCcwIcon />}
      Restore
    </Button>
  );
}

type ClassUpcomingWeeksProps = {
  classId: string;
  weeks: ClassWeekSlot[];
  onSkipClick: (week: ClassWeekSlot) => void;
  onRestored: (state: UnskipClassWeekActionState) => void;
};

export function ClassUpcomingWeeks({
  classId,
  weeks,
  onSkipClick,
  onRestored,
}: ClassUpcomingWeeksProps) {
  if (weeks.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Upcoming weeks
        </p>
        <ul className="flex flex-wrap gap-2">
          {weeks.map((week) => (
            <li
              key={week.date}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
                week.skipped
                  ? "border-dashed border-amber-500/50 bg-amber-500/10"
                  : "bg-background"
              )}
            >
              <span className="flex flex-col leading-tight">
                <span
                  className={cn(
                    "font-medium",
                    week.skipped && "text-muted-foreground line-through"
                  )}
                >
                  {formatClassWeekDate(week.date)}
                </span>
                {week.skipped ? (
                  <span
                    className="max-w-[10rem] truncate text-[11px] text-amber-700 dark:text-amber-300"
                    title={week.skipReason ?? undefined}
                  >
                    Skipped{week.skipReason ? ` · ${week.skipReason}` : ""}
                  </span>
                ) : null}
              </span>

              <Can permission={PERMISSIONS.SESSIONS_SKIP}>
                {week.skipped ? (
                  <UnskipWeekButton
                    classId={classId}
                    week={week}
                    onRestored={onRestored}
                  />
                ) : week.canSkip ? (
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => onSkipClick(week)}
                    aria-label={`Skip the week of ${formatClassWeekDate(week.date)}`}
                  >
                    <CalendarOffIcon />
                    Skip
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger
                      render={<span className="inline-flex" tabIndex={0} />}
                    >
                      <Button type="button" size="xs" variant="ghost" disabled>
                        <CalendarOffIcon />
                        Skip
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{week.blockedReason}</TooltipContent>
                  </Tooltip>
                )}
              </Can>
            </li>
          ))}
        </ul>
      </div>
    </TooltipProvider>
  );
}
