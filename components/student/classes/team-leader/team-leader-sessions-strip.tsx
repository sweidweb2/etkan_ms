"use client";

import { CalendarIcon } from "lucide-react";
import { ClassSessionCard } from "@/components/manager/classes/class-session-card";
import { EmptyState } from "@/components/ui/empty-state";
import { HorizontalScrollCarousel } from "@/components/ui/horizontal-scroll-carousel";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";

type TeamLeaderSessionsStripProps = {
  classId: string;
  className: string;
  sessions: ManagerClassSessionRow[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
};

export function TeamLeaderSessionsStrip({
  classId,
  className,
  sessions,
  selectedSessionId,
  onSelect,
}: TeamLeaderSessionsStripProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={CalendarIcon}
        title="No sessions yet"
        description="Attendance opens once sessions are scheduled for this class."
      />
    );
  }

  return (
    <HorizontalScrollCarousel
      ariaLabel={`Sessions for ${className}`}
      className="rounded-lg"
      navButtonClassName="size-8 rounded-full text-muted-foreground hover:bg-background/80 hover:text-foreground disabled:opacity-30"
      initialScrollPosition="end"
      resetScrollKey={sessions.map((session) => session.id).join("|")}
    >
      <div className="flex w-max flex-row items-stretch gap-3 p-1">
        {sessions.map((session) => (
          <ClassSessionCard
            key={session.id}
            session={session}
            classId={classId}
            selected={session.id === selectedSessionId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </HorizontalScrollCarousel>
  );
}
