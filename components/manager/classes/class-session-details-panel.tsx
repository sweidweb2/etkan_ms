"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { format, formatDistanceStrict } from "date-fns";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { deleteClassSessionAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { EditClassSessionDialog } from "@/components/manager/classes/edit-class-session-dialog";
import { SessionDetailsActions } from "@/components/manager/classes/session-details-actions";
import { SessionDetailsTabsSection } from "@/components/manager/classes/session-details-tabs-section";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { PendingFlowChecklist } from "@/components/loaders/pending-flow-checklist";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import {
  SESSION_TIMING_BADGE_CLASSES,
  SESSION_TIMING_LABELS,
} from "@/lib/constants/manager-class-session-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { SESSION_GROUP_GRADE_LEVEL_LABELS } from "@/lib/constants/manager-session-group-grade-display";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import {
  getManagerClassDetailRoute,
  getManagerSemesterDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useStagedPendingProgress } from "@/hooks/use-staged-pending-progress";
import { cn } from "@/lib/utils";
import {
  getSessionTimingLabel,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import type {
  DeleteClassSessionActionState,
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
  hasComputedGrades?: boolean;
  lockedUserIds?: string[];
  /** Panel navigation (defaults to manager class routes). */
  navigation?: {
    classesListHref: string;
    classesListLabel: string;
    classDetailHref: string;
  };
};

const initialDeleteState: DeleteClassSessionActionState = {};

const DELETE_SESSION_FLOW_STEPS = [
  {
    id: "group-grade",
    label: "Checking group grade for this session…",
  },
  {
    id: "attendees",
    label: "Deleting attendees related to this session…",
  },
  {
    id: "session",
    label: "Deleting this session…",
  },
  {
    id: "renumber",
    label: "Renumbering remaining sessions…",
  },
] as const;


function getDeleteBlockedReason({
  hasComputedGrades,
  hasGroupGrade,
  hasTasks,
}: {
  hasComputedGrades: boolean;
  hasGroupGrade: boolean;
  hasTasks: boolean;
}): string | undefined {
  if (hasComputedGrades) {
    return CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR;
  }

  if (hasGroupGrade) {
    return "Clear the session difficulty before deleting.";
  }

  if (hasTasks) {
    return "Delete or reassign session tasks before deleting the session.";
  }

  return undefined;
}

export function ClassSessionDetailsPanel({
  session: initialSession,
  classRow,
  linkedPhase: initialLinkedPhase,
  phaseOptions,
  initialTasks,
  initialAttendees,
  hasComputedGrades = false,
  lockedUserIds = [],
  navigation,
}: ClassSessionDetailsPanelProps) {
  const [session, setSession] = useState(initialSession);
  const [linkedPhase, setLinkedPhase] =
    useState<ManagerSessionPhaseLink | null>(initialLinkedPhase);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteClassSessionAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    setIsDeleteOpen
  );
  const deleteFlowActiveIndex = useStagedPendingProgress(
    isDeleteActionPending,
    DELETE_SESSION_FLOW_STEPS.length
  );

  useActionStateToast(deleteState, isDeleteActionPending);

  const nav = navigation ?? {
    classesListHref: ROUTES.MANAGER_CLASSES,
    classesListLabel: "Manage classes",
    classDetailHref: getManagerClassDetailRoute(classRow.id),
  };

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
  const hasTasks = initialTasks.length > 0;
  const deleteBlockedReason = getDeleteBlockedReason({
    hasComputedGrades,
    hasGroupGrade: groupGradeLevel != null,
    hasTasks,
  });
  const isDeleteDisabled = deleteBlockedReason != null;

  function handleConfirmDelete() {
    const formData = new FormData();
    formData.set("session_id", session.id);
    formData.set("return_to", nav.classDetailHref);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={nav.classesListHref} prefetch={false}>
              {nav.classesListLabel}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={nav.classDetailHref} prefetch={false}>
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

      <ClassTabCollapsibleSection
        title={`S${session.nb_order} · ${session.topic}`}
        description="Session overview, timing, phase link, and group grade."
        storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.SESSION_DETAILS_INFO}
        defaultOpen
        action={
          <div className="flex items-center gap-2">
            <Can permission={PERMISSIONS.SESSIONS_UPDATE}>
              <Button
                type="button"
                disabled={hasComputedGrades}
                title={
                  hasComputedGrades
                    ? CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR
                    : undefined
                }
                onClick={() => setIsEditOpen(true)}
              >
                <PencilIcon data-icon="inline-start" />
                Edit session
              </Button>
            </Can>
            <Can permission={PERMISSIONS.SESSIONS_DELETE}>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleteDisabled || isDeleteActionPending}
                title={deleteBlockedReason}
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete session
              </Button>
            </Can>
          </div>
        }
      >
        <div className="px-4 pt-2 pb-4">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Topic" value={session.topic} />
            <DetailField
              label="Session report"
              className="sm:col-span-2 lg:col-span-3 whitespace-pre-wrap"
              value={session.session_report?.trim() ? session.session_report : "—"}
            />
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
                href={nav.classDetailHref}
                prefetch={false}
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
        </div>
      </ClassTabCollapsibleSection>

      <EditClassSessionDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        session={session}
        classId={classRow.id}
        className={classRow.name}
        onSessionUpdated={setSession}
      />

      <Dialog
        open={isDeleteOpen}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isDeleteActionPending}>
          <DialogHeader>
            <DialogTitle>Delete session</DialogTitle>
            <DialogDescription>
              {isDeleteActionPending
                ? "Please wait while this session is removed."
                : `This will permanently delete S${session.nb_order} · ${session.topic} and its attendance records. Remaining sessions will be renumbered. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {isDeleteActionPending ? (
            <PendingFlowChecklist
              steps={DELETE_SESSION_FLOW_STEPS}
              activeIndex={deleteFlowActiveIndex}
            />
          ) : null}
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={isDeleteActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleteActionPending}
            >
              {isDeleteActionPending ? (
                <>
                  <InlineSpinner />
                  Deleting session
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SessionDetailsActions
        classId={classRow.id}
        sessionId={session.id}
        linkedPhase={linkedPhase}
        phaseOptions={phaseOptions}
        defaultPhaseId={classRow.semester_id}
        groupGradeLevel={groupGradeLevel}
        sessionReport={session.session_report}
        hasComputedGrades={hasComputedGrades}
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
        initialTasks={initialTasks}
        initialAttendees={initialAttendees}
        lockedUserIds={lockedUserIds}
      />
    </div>
  );
}
