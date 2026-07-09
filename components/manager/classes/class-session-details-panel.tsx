"use client";

import Link from "next/link";
import { useState } from "react";
import { format, formatDistanceStrict } from "date-fns";
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
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SESSION_TIMING_BADGE_CLASSES,
  SESSION_TIMING_LABELS,
} from "@/lib/constants/manager-class-session-display";
import { getSessionPhaseLinkPreview } from "@/lib/constants/manager-session-phase-link-mock";
import { getSessionGroupGradePreview } from "@/lib/constants/manager-session-group-grade-mock";
import { setPreviewSessionPhaseLink } from "@/lib/preview/manager-session-phase-store";
import { setPreviewSessionGroupGrade } from "@/lib/preview/manager-session-group-grade-store";
import { SESSION_GROUP_GRADE_LEVEL_LABELS } from "@/lib/constants/manager-session-group-grade-display";
import { getManagerClassPreview } from "@/lib/manager/get-manager-class-preview";
import { getManagerClassSessionPreview } from "@/lib/manager/get-manager-class-session-preview";
import {
  getManagerClassDetailRoute,
  getManagerSemesterDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { getSessionTimingLabel } from "@/types/manager-class-session";
import type { ManagerSessionPhaseLink } from "@/types/manager-session-phase-link";
import type { SessionGroupGradeLevelValue } from "@/types/manager-session-group-grade";

type ClassSessionDetailsPanelProps = {
  classId: string;
  sessionId: string;
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
  classId,
  sessionId,
}: ClassSessionDetailsPanelProps) {
  const classRow = getManagerClassPreview(classId);
  const session = getManagerClassSessionPreview(classId, sessionId);
  const [linkedPhase, setLinkedPhase] = useState<ManagerSessionPhaseLink | null>(
    () =>
      session
        ? getSessionPhaseLinkPreview(
            sessionId,
            session.nb_order,
            classRow.semester_id
          )
        : null
  );
  const [groupGradeLevel, setGroupGradeLevel] =
    useState<SessionGroupGradeLevelValue | null>(() =>
      session ? getSessionGroupGradePreview(sessionId, session.nb_order) : null
    );

  if (!session) {
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
              <BreadcrumbLink href={getManagerClassDetailRoute(classId)}>
                {classRow.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Session not found</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="py-0">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This session could not be found for {classRow.name}.
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <BreadcrumbLink href={getManagerClassDetailRoute(classId)}>
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

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/50 py-4">
          <CardTitle className="text-xl">
            S{session.nb_order} · {session.topic}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
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
                href={getManagerClassDetailRoute(classId)}
                className="text-primary underline-offset-4 hover:underline"
              >
                {classRow.name}
              </Link>
            </DetailField>
            <DetailField
              label="Class ID"
              value={session.class_id}
              className="font-mono text-xs"
            />
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

      <SessionDetailsActions
        linkedPhase={linkedPhase}
        defaultPhaseId={classRow.semester_id}
        groupGradeLevel={groupGradeLevel}
        onLinkPhase={(link) => {
          setPreviewSessionPhaseLink(sessionId, link);
          setLinkedPhase(link);
        }}
        onSaveGroupGrade={(level) => {
          setPreviewSessionGroupGrade(sessionId, level);
          setGroupGradeLevel(level);
        }}
      />

      <SessionDetailsTabsSection classId={classId} sessionId={sessionId} />
    </div>
  );
}
