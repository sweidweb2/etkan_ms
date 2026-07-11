"use client";

import Link from "next/link";
import { useState } from "react";
import { format, formatDistanceStrict } from "date-fns";
import { PencilIcon } from "lucide-react";
import { EditClassSessionDialog } from "@/components/manager/classes/edit-class-session-dialog";
import { SessionDetailsActions } from "@/components/manager/classes/session-details-actions";
import { SessionDetailsTabsSection } from "@/components/manager/classes/session-details-tabs-section";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  SESSION_TIMING_BADGE_CLASSES,
  SESSION_TIMING_LABELS,
} from "@/lib/constants/manager-class-session-display";
import { SESSION_GROUP_GRADE_LEVEL_LABELS } from "@/lib/constants/manager-session-group-grade-display";
import {
  getManagerClassDetailRoute,
  getManagerSemesterDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import {
  getSessionTimingLabel,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import type {
  ManagerSessionAttendeeRow,
  ManagerSessionTaskRow,
} from "@/types/manager-class-session-detail";
import type { ManagerSessionPhaseLink } from "@/types/manager-session-phase-link";

type ClassSessionDetailsPanelProps = {
  session: ManagerClassSessionRow;
  classRow: {
    id: string;
    name: string;
    semester_id: string | null;
    semester_name: string | null;
  };
  linkedPhase: ManagerSessionPhaseLink | null;
  phaseOptions: ManagerSessionPhaseLink[];
  initialTasks: ManagerSessionTaskRow[];
  initialAttendees: ManagerSessionAttendeeRow[];
};

function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("text-sm text-foreground", className)}>
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}

export function ClassSessionDetailsPanel({
  session: initialSession,
  classRow,
  linkedPhase: initialLinkedPhase,
  phaseOptions,
  initialTasks,
  initialAttendees,
}: ClassSessionDetailsPanelProps) {
  const [session, setSession] = useState(initialSession);
  const [linkedPhase, setLinkedPhase] =
    useState<ManagerSessionPhaseLink | null>(initialLinkedPhase);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const timingLabel = getSessionTimingLabel(session);
  const timingText = SESSION_TIMING_LABELS[timingLabel];
  const timingClassName =
    SESSION_TIMING_BADGE_CLASSES[timingLabel] ??
    "bg-muted text-muted-foreground";
  const startsAt = new Date(session.starts_at);
  const endsAt = new Date(session.ends_at);
  const startsText = format(startsAt, "MMM d, yyyy 'at' h:mm a");
  const endsText = format(endsAt, "MMM d, yyyy 'at' h:mm a");
  const createdText = format(
    new Date(session.created_at),
    "MMM d, yyyy 'at' h:mm a"
  );
  const durationText = formatDistanceStrict(startsAt, endsAt);
  const groupGradeLevel = session.group_grade_level;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_CLASSES}>
              Manage classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={getManagerClassDetailRoute(classRow.id)}>
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              S{session.nb_order} · {session.topic}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle className="text-xl">
            S{session.nb_order} · {session.topic}
          </CardTitle>
          <CardAction className="self-center">
            <Button type="button" onClick={() => setIsEditOpen(true)}>
              <PencilIcon data-icon="inline-start" />
              Edit session
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Topic" value={session.topic} />
            <DetailField label="Order" value={`S${session.nb_order}`} />
            <DetailField label="Timing">
              <span
                className={cn(
                  "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                  timingClassName
                )}
              >
                {timingText}
              </span>
            </DetailField>
            <DetailField label="Starts at" value={startsText} />
            <DetailField label="Ends at" value={endsText} />
            <DetailField label="Duration" value={durationText} />
            <DetailField label="Class">
              <Link
                href={getManagerClassDetailRoute(classRow.id)}
                className="text-primary underline-offset-4 hover:underline"
              >
                {classRow.name}
              </Link>
            </DetailField>
            <DetailField
              label="Session ID"
              value={session.id}
              className="font-mono text-xs"
            />
            <DetailField label="Created" value={createdText} />
            <DetailField label="Phase">
              {linkedPhase ? (
                <Link
                  href={getManagerSemesterDetailRoute(linkedPhase.phase_id)}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {linkedPhase.phase_name}
                </Link>
              ) : (
                "Not linked"
              )}
            </DetailField>
            <DetailField label="Group grade">
              {groupGradeLevel
                ? SESSION_GROUP_GRADE_LEVEL_LABELS[groupGradeLevel]
                : "Not set"}
            </DetailField>
          </dl>
        </CardContent>
      </Card>

      <EditClassSessionDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        session={session}
        classId={classRow.id}
        className={classRow.name}
        onSessionUpdated={setSession}
      />

      <SessionDetailsActions
        classId={classRow.id}
        sessionId={session.id}
        linkedPhase={linkedPhase}
        phaseOptions={phaseOptions}
        defaultPhaseId={classRow.semester_id}
        groupGradeLevel={groupGradeLevel}
        onSettingsUpdated={(nextSession, nextLinkedPhase) => {
          setSession(nextSession);
          if (nextLinkedPhase !== undefined) {
            setLinkedPhase(nextLinkedPhase);
          }
        }}
      />

      <SessionDetailsTabsSection
        classId={classRow.id}
        sessionId={session.id}
        sessionLabel={`S${session.nb_order} · ${session.topic}`}
        sessionStartsAt={session.starts_at}
        initialTasks={initialTasks}
        initialAttendees={initialAttendees}
      />
    </div>
  );
}
