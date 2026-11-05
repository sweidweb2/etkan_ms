"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { PencilIcon, Trash2Icon, XIcon } from "lucide-react";
import { deleteClassSessionAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { EditClassSessionDialog } from "@/components/manager/classes/edit-class-session-dialog";
import { SessionDetailsActions } from "@/components/manager/classes/session-details-actions";
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
import { PERMISSIONS } from "@/lib/constants/permissions";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import {
  getManagerClassDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useStagedPendingProgress } from "@/hooks/use-staged-pending-progress";
import { cn } from "@/lib/utils";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type {
  DeleteClassSessionActionState,
  ManagerSessionAttendeeRow,
} from "@/types/manager-class-session-detail";

type ClassSessionDetailsPanelProps = {
  session: ManagerClassSessionRow;
  classRow: {
    id: string;
    name: string;
    semester_id?: string | null;
    semester_name?: string | null;
  };
  initialAttendees: ManagerSessionAttendeeRow[];
  hasComputedGrades?: boolean;
  lockedUserIds?: string[];
  /** Panel navigation (defaults to manager class routes). */
  navigation?: {
    classesListHref: string;
    classesListLabel: string;
    classDetailHref: string;
  };
  /** Inline under a class Sessions tab (no standalone page chrome). */
  embedded?: boolean;
  onClose?: () => void;
  onSessionUpdated?: (session: ManagerClassSessionRow) => void;
};

const initialDeleteState: DeleteClassSessionActionState = {};

const DELETE_SESSION_FLOW_STEPS = [
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

function getDeleteBlockedReason(
  hasComputedGrades: boolean
): string | undefined {
  if (hasComputedGrades) {
    return CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR;
  }

  return undefined;
}

export function ClassSessionDetailsPanel({
  session: initialSession,
  classRow,
  initialAttendees,
  hasComputedGrades = false,
  lockedUserIds = [],
  navigation,
  embedded = false,
  onClose,
  onSessionUpdated,
}: ClassSessionDetailsPanelProps) {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local editable copies when server props refresh
    setSession(initialSession);
    setAttendees(initialAttendees);
  }, [initialSession, initialAttendees]);

  const nav = navigation ?? {
    classesListHref: ROUTES.MANAGER_CLASSES,
    classesListLabel: "Manage classes",
    classDetailHref: getManagerClassDetailRoute(classRow.id),
  };

  const deleteBlockedReason = getDeleteBlockedReason(hasComputedGrades);
  const isDeleteDisabled = deleteBlockedReason != null;
  const actionSize = embedded ? "sm" : "default";
  const actionVariant = embedded ? "outline" : "default";
  const sessionLabel = `S${session.nb_order} · ${session.topic}`;

  function handleSessionUpdated(next: ManagerClassSessionRow) {
    setSession(next);
    onSessionUpdated?.(next);
  }

  function handleConfirmDelete() {
    const formData = new FormData();
    formData.set("session_id", session.id);
    formData.set("return_to", nav.classDetailHref);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  const sessionMutationActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={PERMISSIONS.SESSIONS_UPDATE}>
        <Button
          type="button"
          variant={actionVariant}
          size={actionSize}
          disabled={hasComputedGrades}
          title={
            hasComputedGrades
              ? CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR
              : undefined
          }
          onClick={() => setIsEditOpen(true)}
        >
          <PencilIcon data-icon="inline-start" />
          {embedded ? "Edit" : "Edit session"}
        </Button>
      </Can>
      <Can permission={PERMISSIONS.SESSIONS_DELETE}>
        <Button
          type="button"
          variant="destructive"
          size={actionSize}
          disabled={isDeleteDisabled || isDeleteActionPending}
          title={deleteBlockedReason}
          onClick={() => setIsDeleteOpen(true)}
        >
          <Trash2Icon data-icon="inline-start" />
          {embedded ? "Delete" : "Delete session"}
        </Button>
      </Can>
    </div>
  );

  return (
    <div className={cn("flex flex-col", embedded ? "gap-4" : "gap-6")}>
      {embedded ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{sessionLabel}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {classRow.name}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {sessionMutationActions}
            {onClose ? (
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
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
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
                <BreadcrumbPage>{sessionLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {sessionMutationActions}
        </div>
      )}

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
                : `This will permanently delete ${sessionLabel} and its attendance records. Remaining sessions will be renumbered.${
                    embedded ? "" : " This action cannot be undone."
                  }`}
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
                  Deleting{embedded ? "" : " session"}
                </>
              ) : embedded ? (
                "Delete"
              ) : (
                "Delete session"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SessionDetailsActions
        key={session.id}
        classId={classRow.id}
        sessionId={session.id}
        groupGradeLevel={session.group_grade_level}
        sessionReport={session.session_report}
        hasComputedGrades={hasComputedGrades}
        attendees={attendees}
        lockedUserIds={lockedUserIds}
        onAttendeeUpdated={(attendee) => {
          setAttendees((current) =>
            current.map((row) => (row.id === attendee.id ? attendee : row))
          );
        }}
        onSettingsUpdated={handleSessionUpdated}
      />
    </div>
  );
}
