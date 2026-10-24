"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { format, formatDistanceStrict } from "date-fns";
import { PencilIcon, Trash2Icon, XIcon } from "lucide-react";
import { deleteClassSessionAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { EditClassSessionDialog } from "@/components/manager/classes/edit-class-session-dialog";
import { SessionDetailsActions } from "@/components/manager/classes/session-details-actions";
import { SessionDetailsTabsSection } from "@/components/manager/classes/session-details-tabs-section";
import { DetailField } from "@/components/manager/shared/detail-field";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { PendingFlowChecklist } from "@/components/loaders/pending-flow-checklist";
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
import { getTeacherClassDetailRoute } from "@/lib/constants/routes";
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
} from "@/types/manager-class-session-detail";

type TeacherClassSessionDetailsPanelProps = {
  session: ManagerClassSessionRow;
  classRow: {
    id: string;
    name: string;
  };
  initialAttendees: ManagerSessionAttendeeRow[];
  hasComputedGrades?: boolean;
  lockedUserIds?: string[];
  /** Inline under the Sessions tab (no standalone page chrome). */
  embedded?: boolean;
  onClose?: () => void;
  onSessionUpdated?: (session: ManagerClassSessionRow) => void;
};

const initialDeleteState: DeleteClassSessionActionState = {};

const DELETE_SESSION_FLOW_STEPS = [
  { id: "group-grade", label: "Checking group grade for this session…" },
  { id: "attendees", label: "Deleting attendees related to this session…" },
  { id: "session", label: "Deleting this session…" },
  { id: "renumber", label: "Renumbering remaining sessions…" },
] as const;

/**
 * Teacher session surface: overview grid, level/report settings, attendance.
 */
export function TeacherClassSessionDetailsPanel({
  session: initialSession,
  classRow,
  initialAttendees,
  hasComputedGrades = false,
  lockedUserIds = [],
  embedded = false,
  onClose,
  onSessionUpdated,
}: TeacherClassSessionDetailsPanelProps) {
  const [session, setSession] = useState(initialSession);
  const [attendees, setAttendees] = useState(initialAttendees);
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

  useEffect(() => {
    setSession(initialSession);
    setAttendees(initialAttendees);
  }, [initialSession, initialAttendees]);

  const classDetailHref = getTeacherClassDetailRoute(classRow.id, "sessions");
  const timingLabel = getSessionTimingLabel(session);
  const timingText = SESSION_TIMING_LABELS[timingLabel];
  const timingClassName =
    SESSION_TIMING_BADGE_CLASSES[timingLabel] ??
    "bg-muted text-muted-foreground";
  const startsAt = new Date(session.starts_at);
  const endsAt = new Date(session.ends_at);
  const startsText = format(startsAt, "MMM d, yyyy · h:mm a");
  const endsText = format(endsAt, "MMM d, yyyy · h:mm a");
  const durationText = formatDistanceStrict(startsAt, endsAt);
  const createdText = format(new Date(session.created_at), "MMM d, yyyy");
  const groupGradeLevel = session.group_grade_level;
  const isDeleteDisabled = hasComputedGrades || groupGradeLevel != null;
  const deleteBlockedReason = hasComputedGrades
    ? CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR
    : groupGradeLevel != null
      ? "Clear the session difficulty before deleting."
      : undefined;

  function handleSessionUpdated(next: ManagerClassSessionRow) {
    setSession(next);
    onSessionUpdated?.(next);
  }

  function handleConfirmDelete() {
    const formData = new FormData();
    formData.set("session_id", session.id);
    formData.set("return_to", classDetailHref);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ClassTabCollapsibleSection
        title={`S${session.nb_order} · ${session.topic}`}
        description="Session overview, timing, report, and group grade."
        storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.SESSION_DETAILS_INFO}
        defaultOpen
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Can permission={PERMISSIONS.SESSIONS_UPDATE}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={hasComputedGrades}
                title={
                  hasComputedGrades
                    ? CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR
                    : undefined
                }
                onClick={() => setIsEditOpen(true)}
              >
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
            </Can>
            <Can permission={PERMISSIONS.SESSIONS_DELETE}>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeleteDisabled || isDeleteActionPending}
                title={deleteBlockedReason}
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            </Can>
            {embedded && onClose ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close session details"
              >
                <XIcon data-icon="inline-start" />
                Close
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="px-4 pt-2 pb-4">
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
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
            <DetailField label="Class" value={classRow.name} />
            <DetailField label="Created" value={createdText} />
            <DetailField
              label="Group grade"
              value={
                groupGradeLevel
                  ? SESSION_GROUP_GRADE_LEVEL_LABELS[groupGradeLevel]
                  : "Not set"
              }
            />
            <DetailField
              label="Session report"
              className="sm:col-span-2 lg:col-span-3 whitespace-pre-wrap"
              value={
                session.session_report?.trim() ? session.session_report : "—"
              }
            />
          </dl>
        </div>
      </ClassTabCollapsibleSection>

      <EditClassSessionDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        session={session}
        classId={classRow.id}
        className={classRow.name}
        onSessionUpdated={handleSessionUpdated}
      />

      <Dialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleteActionPending}
        >
          <DialogHeader>
            <DialogTitle>Delete session</DialogTitle>
            <DialogDescription>
              {isDeleteActionPending
                ? "Please wait while this session is removed."
                : `This will permanently delete S${session.nb_order} · ${session.topic} and its attendance records. Remaining sessions will be renumbered.`}
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
                  Deleting
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
        linkedPhase={null}
        phaseOptions={[]}
        groupGradeLevel={groupGradeLevel}
        sessionReport={session.session_report}
        hasComputedGrades={hasComputedGrades}
        hidePhase
        onSettingsUpdated={(nextSession) => {
          handleSessionUpdated(nextSession);
        }}
      />

      <SessionDetailsTabsSection
        key={session.id}
        classId={classRow.id}
        sessionId={session.id}
        sessionLabel={`S${session.nb_order} · ${session.topic}`}
        initialTasks={[]}
        initialAttendees={attendees}
        lockedUserIds={lockedUserIds}
        mode="attendance"
      />
    </div>
  );
}
