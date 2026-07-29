"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddClassSessionDialog } from "@/components/manager/classes/add-class-session-dialog";
import { ClassSessionCard } from "@/components/manager/classes/class-session-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { HorizontalScrollCarousel } from "@/components/ui/horizontal-scroll-carousel";
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
};

export function ClassSessionsSection({
  classId,
  className,
  sessions,
  onSessionsChange,
  onClassUpdated,
  hasComputedGrades = false,
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

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Sessions</CardTitle>
          <p className="text-sm text-muted-foreground">
            {sortedSessions.length} planned session
            {sortedSessions.length === 1 ? "" : "s"} for {className}.
          </p>
          <CardAction className="self-center">
            <Can permission={PERMISSIONS.SESSIONS_CREATE}>
              {hasComputedGrades ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="inline-flex" tabIndex={0} />
                      }
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
          </CardAction>
        </CardHeader>
        <CardContent className="py-3">
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
                resetScrollKey={sortedSessions.map((session) => session.id).join("|")}
              >
                <div className="flex w-max flex-row gap-3 p-1">
                  {sortedSessions.map((session) => (
                    <ClassSessionCard
                      key={session.id}
                      classId={classId}
                      session={session}
                    />
                  ))}
                </div>
              </HorizontalScrollCarousel>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
