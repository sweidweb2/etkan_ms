"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddClassSessionDialog } from "@/components/manager/classes/add-class-session-dialog";
import { ClassSessionCard } from "@/components/manager/classes/class-session-card";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { Button } from "@/components/ui/button";
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
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import type { ManagerClassRow } from "@/types/manager-class-list";

type ClassSessionsSectionProps = {
  classId: string;
  className: string;
  sessions: ManagerClassSessionRow[];
  onSessionsChange: (sessions: ManagerClassSessionRow[]) => void;
  onClassUpdated: (classRow: ManagerClassRow) => void;
  hasComputedGrades?: boolean;
  /** Override session card detail links (defaults to manager routes). */
  getSessionDetailHref?: (sessionId: string) => string;
  /** When set, cards select inline instead of navigating. */
  selectedSessionId?: string | null;
  onSessionSelect?: (sessionId: string) => void;
};

export function ClassSessionsSection({
  classId,
  className,
  sessions,
  onSessionsChange,
  onClassUpdated,
  hasComputedGrades = false,
  getSessionDetailHref,
  selectedSessionId = null,
  onSessionSelect,
}: ClassSessionsSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  const sortedSessions = useMemo(
    () => sortClassSessionsNewestFirst(sessions),
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

      <ClassTabCollapsibleSection
        title="Sessions"
        description={`${sortedSessions.length} planned session${sortedSessions.length === 1 ? "" : "s"} for ${className}.`}
        storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.CLASS_DETAILS_SESSIONS}
        defaultOpen
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
        <div className="px-4 py-3">
          {sortedSessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sessions are planned for this class yet.
            </p>
          ) : (
            <div className="min-w-0 overflow-hidden rounded-xl bg-muted/25 p-2 ring-1 ring-foreground/8">
              <HorizontalScrollCarousel
                ariaLabel={`Sessions for ${className}`}
                className="rounded-lg"
                navButtonClassName="size-8 rounded-full text-muted-foreground hover:bg-background/80 hover:text-foreground disabled:opacity-30"
                initialScrollPosition="start"
                resetScrollKey={sortedSessions
                  .map((session) => session.id)
                  .join("|")}
              >
                <div className="flex w-max flex-row gap-3 p-1">
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
                    />
                  ))}
                </div>
              </HorizontalScrollCarousel>
            </div>
          )}
        </div>
      </ClassTabCollapsibleSection>
    </>
  );
}
