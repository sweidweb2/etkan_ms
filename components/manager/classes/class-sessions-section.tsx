"use client";

import { useMemo, useState } from "react";
import { CalendarIcon, CalendarOffIcon, PlusIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddClassSessionDialog } from "@/components/manager/classes/add-class-session-dialog";
import { ClassSessionCard } from "@/components/manager/classes/class-session-card";
import {
  ClassUpcomingWeeks,
  formatClassWeekDate,
} from "@/components/manager/classes/class-upcoming-weeks";
import {
  SkipClassWeekDialog,
  type SkipClassWeekTarget,
} from "@/components/manager/classes/skip-class-week-dialog";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HorizontalScrollCarousel } from "@/components/ui/horizontal-scroll-carousel";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import {
  sortClassSessionsNewestFirst,
  sortClassSessionsOldestFirst,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type {
  ClassWeekSkipState,
  SkipClassWeekActionState,
  UnskipClassWeekActionState,
} from "@/types/manager-class-week-skip";

function LatestSessionSkipButton({
  canSkip,
  blockedReason,
  onSkip,
}: {
  canSkip: boolean;
  blockedReason: string | null;
  onSkip: () => void;
}) {
  const button = (
    <Button
      type="button"
      size="xs"
      variant="ghost"
      disabled={!canSkip}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSkip();
      }}
    >
      <CalendarOffIcon />
      Skip this week
    </Button>
  );

  if (canSkip) {
    return button;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
          {button}
        </TooltipTrigger>
        <TooltipContent>{blockedReason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type ClassSessionsSectionProps = {
  classId: string;
  className: string;
  sessions: ManagerClassSessionRow[];
  onSessionsChange: (sessions: ManagerClassSessionRow[]) => void;
  weekSkipState: ClassWeekSkipState;
  onWeekSkipStateChange: (state: ClassWeekSkipState) => void;
  onClassUpdated: (classRow: ManagerClassRow) => void;
  hasComputedGrades?: boolean;
  /** Override session card detail links (defaults to manager routes). */
  getSessionDetailHref?: (sessionId: string) => string;
  /** When set, cards select inline instead of navigating. */
  selectedSessionId?: string | null;
  onSessionSelect?: (sessionId: string) => void;
  /** When false, section stays open with no expand/collapse controls. */
  collapsible?: boolean;
};

export function ClassSessionsSection({
  classId,
  className,
  sessions,
  onSessionsChange,
  weekSkipState,
  onWeekSkipStateChange,
  onClassUpdated,
  hasComputedGrades = false,
  getSessionDetailHref,
  selectedSessionId = null,
  onSessionSelect,
  collapsible = true,
}: ClassSessionsSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [skipTarget, setSkipTarget] = useState<SkipClassWeekTarget | null>(
    null
  );
  const latestSessionSkip = weekSkipState.latestSession;

  const sortedSessions = useMemo(
    () => sortClassSessionsOldestFirst(sessions),
    [sessions]
  );

  const nextNbOrder = useMemo(() => {
    if (sortedSessions.length === 0) {
      return 1;
    }

    return Math.max(...sortedSessions.map((session) => session.nb_order)) + 1;
  }, [sortedSessions]);

  const handleSessionCreated = (
    session: ManagerClassSessionRow,
    classRow: ManagerClassRow
  ) => {
    if (sessions.some((row) => row.id === session.id)) {
      onClassUpdated(classRow);
      return;
    }

    onSessionsChange(sortClassSessionsNewestFirst([session, ...sessions]));
    onClassUpdated(classRow);
  };

  const handleWeekSkipped = (state: SkipClassWeekActionState) => {
    if (state.weekSkipState) {
      onWeekSkipStateChange(state.weekSkipState);
    }

    if (state.deletedSessionId) {
      onSessionsChange(
        sessions.filter((session) => session.id !== state.deletedSessionId)
      );
    }
  };

  const handleWeekRestored = (state: UnskipClassWeekActionState) => {
    if (state.weekSkipState) {
      onWeekSkipStateChange(state.weekSkipState);
    }

    const created = state.createdSession;
    if (created && !sessions.some((session) => session.id === created.id)) {
      onSessionsChange(sortClassSessionsNewestFirst([created, ...sessions]));
    }
  };

  return (
    <>
      {isAddOpen ? (
        <AddClassSessionDialog
          open
          onOpenChange={setIsAddOpen}
          classId={classId}
          className={className}
          nextNbOrder={nextNbOrder}
          onSessionCreated={handleSessionCreated}
        />
      ) : null}

      {skipTarget ? (
        <SkipClassWeekDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setSkipTarget(null);
            }
          }}
          classId={classId}
          target={skipTarget}
          onSkipped={handleWeekSkipped}
        />
      ) : null}

      <ClassTabCollapsibleSection
        title="Sessions"
        description={`${sortedSessions.length} planned session${sortedSessions.length === 1 ? "" : "s"} for ${className}.`}
        storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.CLASS_DETAILS_SESSIONS}
        defaultOpen
        collapsible={collapsible}
        action={
          <Can permission={PERMISSIONS.SESSIONS_CREATE}>
            {hasComputedGrades ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={<span className="inline-flex" tabIndex={0} />}
                  >
                    <Button type="button" disabled>
                      <PlusIcon data-icon="inline-start" />
                      Add session
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button type="button" onClick={() => setIsAddOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Add session
              </Button>
            )}
          </Can>
        }
      >
        <div className="px-5 py-4">
          {sortedSessions.length === 0 ? (
            <EmptyState
              size="sm"
              icon={CalendarIcon}
              title="No sessions yet"
              description="No sessions are planned for this class yet."
            />
          ) : (
            <div className="min-w-0 overflow-hidden rounded-xl border border-foreground/8 bg-muted/25 p-2">
              <HorizontalScrollCarousel
                ariaLabel={`Sessions for ${className}`}
                className="rounded-lg"
                navButtonClassName="size-8 rounded-full text-muted-foreground hover:bg-background/80 hover:text-foreground disabled:opacity-30"
                initialScrollPosition="end"
                resetScrollKey={sortedSessions
                  .map((session) => session.id)
                  .join("|")}
              >
                <div className="flex w-max flex-row items-stretch gap-3 p-1">
                  {sortedSessions.map((session) => (
                    <ClassSessionCard
                      key={session.id}
                      classId={classId}
                      session={session}
                      href={
                        onSessionSelect
                          ? undefined
                          : getSessionDetailHref?.(session.id)
                      }
                      onSelect={onSessionSelect}
                      selected={selectedSessionId === session.id}
                      footerAction={
                        latestSessionSkip?.sessionId === session.id ? (
                          <Can permission={PERMISSIONS.SESSIONS_SKIP}>
                            <LatestSessionSkipButton
                              canSkip={latestSessionSkip.canSkip}
                              blockedReason={latestSessionSkip.blockedReason}
                              onSkip={() =>
                                setSkipTarget({
                                  date: latestSessionSkip.date,
                                  sessionId: session.id,
                                  label: `S${session.nb_order} (${formatClassWeekDate(latestSessionSkip.date)})`,
                                })
                              }
                            />
                          </Can>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              </HorizontalScrollCarousel>
            </div>
          )}

          {weekSkipState.weeks.length > 0 ? (
            <div className="mt-4">
              <ClassUpcomingWeeks
                classId={classId}
                weeks={weekSkipState.weeks}
                onSkipClick={(week) =>
                  setSkipTarget({
                    date: week.date,
                    sessionId: null,
                    label: `the week of ${formatClassWeekDate(week.date)}`,
                  })
                }
                onRestored={handleWeekRestored}
              />
            </div>
          ) : null}
        </div>
      </ClassTabCollapsibleSection>
    </>
  );
}
