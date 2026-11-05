"use client";

import { useActionState, useState, useTransition } from "react";
import {
  ClipboardCheckIcon,
  FileTextIcon,
  UsersRoundIcon,
} from "lucide-react";
import { updateSessionSettingsAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { FieldLabel } from "@/components/auth/field-label";
import { SessionAttendanceBoard } from "@/components/manager/classes/session-attendance-board";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  SESSION_GROUP_GRADE_LEVEL_DOT_CLASSES,
  SESSION_GROUP_GRADE_LEVEL_LABELS,
  SESSION_GROUP_GRADE_LEVEL_ORDER,
  SESSION_GROUP_GRADE_LEVEL_TOGGLE_OFF_CLASSES,
  SESSION_GROUP_GRADE_LEVEL_TOGGLE_ON_CLASSES,
} from "@/lib/constants/manager-session-group-grade-display";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { cn } from "@/lib/utils";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type {
  ManagerSessionAttendeeRow,
  UpdateSessionSettingsActionState,
} from "@/types/manager-class-session-detail";
import type { SessionGroupGradeLevelValue } from "@/types/manager-session-group-grade";

const initialState: UpdateSessionSettingsActionState = {};

type SaveTarget = "groupGrade" | "sessionReport";

type SessionDetailsActionsProps = {
  classId: string;
  sessionId: string;
  groupGradeLevel: SessionGroupGradeLevelValue | null;
  sessionReport?: string | null;
  hasComputedGrades?: boolean;
  attendees: ManagerSessionAttendeeRow[];
  lockedUserIds?: string[];
  onAttendeeUpdated: (attendee: ManagerSessionAttendeeRow) => void;
  onSettingsUpdated: (session: ManagerClassSessionRow) => void;
  className?: string;
};

export function SessionDetailsActions({
  classId,
  sessionId,
  groupGradeLevel,
  sessionReport = null,
  hasComputedGrades = false,
  attendees,
  lockedUserIds = [],
  onAttendeeUpdated,
  onSettingsUpdated,
  className,
}: SessionDetailsActionsProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateSessionSettingsAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const permissions = usePermissions();
  const canUpdateSettings = hasPermissionInSet(
    permissions,
    PERMISSIONS.SESSIONS_UPDATE_SETTINGS
  );
  const [saveTarget, setSaveTarget] = useState<SaveTarget | null>(null);
  const isGroupGradePending = isPending && saveTarget === "groupGrade";
  const isSessionReportPending = isPending && saveTarget === "sessionReport";

  useActionStateToast(state, isPending);

  const [selectedGroupGrade, setSelectedGroupGrade] =
    useState<SessionGroupGradeLevelValue | null>(groupGradeLevel);
  const [sessionReportValue, setSessionReportValue] = useState(
    sessionReport ?? ""
  );
  const [groupGradeSyncKey, setGroupGradeSyncKey] = useState(
    groupGradeLevel ?? "none"
  );
  const [sessionReportSyncKey, setSessionReportSyncKey] = useState(
    sessionReport ?? ""
  );

  const nextGroupGradeSyncKey = groupGradeLevel ?? "none";
  if (nextGroupGradeSyncKey !== groupGradeSyncKey) {
    setGroupGradeSyncKey(nextGroupGradeSyncKey);
    setSelectedGroupGrade(groupGradeLevel);
  }

  const nextSessionReportSyncKey = sessionReport ?? "";
  if (nextSessionReportSyncKey !== sessionReportSyncKey) {
    setSessionReportSyncKey(nextSessionReportSyncKey);
    setSessionReportValue(nextSessionReportSyncKey);
  }

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (saveTarget === "groupGrade" && nextState.success !== true) {
        setSelectedGroupGrade(groupGradeLevel);
      }
      setSaveTarget(null);
    },
    () => true
  );

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.session) {
        return;
      }

      onSettingsUpdated(nextState.session);
    },
    (nextState) => Boolean(nextState.success && nextState.session)
  );

  function handleSelectGroupGrade(level: SessionGroupGradeLevelValue) {
    if (
      !canUpdateSettings ||
      isPending ||
      hasComputedGrades ||
      level === selectedGroupGrade
    ) {
      return;
    }

    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("session_id", sessionId);
    formData.set("group_grade_level", level);

    setSelectedGroupGrade(level);
    setSaveTarget("groupGrade");
    startTransition(() => {
      formAction(formData);
    });
  }

  function handleSaveSessionReport() {
    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("session_id", sessionId);
    formData.set("session_report", sessionReportValue);

    setSaveTarget("sessionReport");
    startTransition(() => {
      formAction(formData);
    });
  }

  const sessionReportError = state.fieldErrors?.session_report?.[0];
  const isGroupGradeLocked =
    !canUpdateSettings || isPending || hasComputedGrades;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-4 rounded-xl border border-foreground/10 bg-muted/20 p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <ClipboardCheckIcon className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Attendance</h3>
            <p className="text-xs text-muted-foreground">
              Drag students between status lanes to update attendance. Use the
              × on a present student to mark them absent.
            </p>
          </div>
        </div>
        <SessionAttendanceBoard
          classId={classId}
          sessionId={sessionId}
          attendees={attendees}
          lockedUserIds={lockedUserIds}
          onAttendeeUpdated={onAttendeeUpdated}
        />
      </div>

      <div className="grid gap-4 @2xl/panel:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border border-foreground/10 bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <UsersRoundIcon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Group grade</h3>
              <p className="text-xs text-muted-foreground">
                {canUpdateSettings && !hasComputedGrades
                  ? "Choose a level. It saves for this session right away."
                  : "Difficulty level for this session."}
              </p>
            </div>
          </div>

          <fieldset
            className="flex flex-col gap-2"
            aria-busy={isGroupGradePending}
            aria-disabled={isGroupGradeLocked}
          >
            <legend className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-sm font-medium">
              <span>Level</span>
              {canUpdateSettings && !hasComputedGrades ? (
                <span className="text-xs font-normal text-muted-foreground">
                  {isGroupGradePending ? "Saving…" : "Saves on select"}
                </span>
              ) : null}
            </legend>
            <div
              className={cn(
                "flex flex-wrap gap-2",
                isGroupGradeLocked && "cursor-not-allowed"
              )}
            >
              {SESSION_GROUP_GRADE_LEVEL_ORDER.map((level) => {
                const isSelected = selectedGroupGrade === level;
                const isSavingLevel = isGroupGradePending && isSelected;

                return (
                  <button
                    key={level}
                    id={
                      level === SESSION_GROUP_GRADE_LEVEL_ORDER[0]
                        ? "session-group-grade-level"
                        : undefined
                    }
                    type="button"
                    data-state={isSelected ? "on" : "off"}
                    aria-pressed={isSelected}
                    aria-disabled={isGroupGradeLocked}
                    tabIndex={isGroupGradeLocked ? -1 : undefined}
                    title={
                      hasComputedGrades
                        ? CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR
                        : undefined
                    }
                    onClick={() => handleSelectGroupGrade(level)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      isGroupGradeLocked && "pointer-events-none",
                      isSelected
                        ? SESSION_GROUP_GRADE_LEVEL_TOGGLE_ON_CLASSES[level]
                        : SESSION_GROUP_GRADE_LEVEL_TOGGLE_OFF_CLASSES[level]
                    )}
                  >
                    {isSavingLevel ? (
                      <InlineSpinner className="size-3" />
                    ) : (
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          SESSION_GROUP_GRADE_LEVEL_DOT_CLASSES[level],
                          isSelected ? "opacity-100" : "opacity-45"
                        )}
                        aria-hidden="true"
                      />
                    )}
                    {SESSION_GROUP_GRADE_LEVEL_LABELS[level]}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {hasComputedGrades ? (
            <p className="text-xs text-muted-foreground">
              {CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR}
            </p>
          ) : null}
        </div>

          <div className="flex flex-col gap-4 rounded-xl border border-foreground/10 bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <FileTextIcon className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-medium">Session report</h3>
                <p className="text-xs text-muted-foreground">
                  Optional notes about how the session went.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="session-settings-report"
                label="Report"
                hint="Optional"
              />
              <textarea
                id="session-settings-report"
                rows={5}
                value={sessionReportValue}
                onChange={(event) => setSessionReportValue(event.target.value)}
                aria-invalid={!!sessionReportError}
                disabled={isPending}
                className={cn(
                  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                )}
                placeholder="What happened in this session…"
              />
              {sessionReportError ? (
                <p className="text-sm text-destructive">{sessionReportError}</p>
              ) : null}
            </div>

            <Can permission={PERMISSIONS.SESSIONS_UPDATE_SETTINGS}>
              <Button
                type="button"
                className="self-start"
                disabled={isPending}
                onClick={handleSaveSessionReport}
              >
                {isSessionReportPending ? <InlineSpinner /> : null}
                Save session report
              </Button>
            </Can>
          </div>
        </div>
    </div>
  );
}
