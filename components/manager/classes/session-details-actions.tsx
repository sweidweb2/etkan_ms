"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { LayersIcon, UsersRoundIcon } from "lucide-react";
import { updateSessionSettingsAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { FieldLabel } from "@/components/auth/field-label";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import {
  SESSION_GROUP_GRADE_LEVEL_DOT_CLASSES,
  SESSION_GROUP_GRADE_LEVEL_LABELS,
  SESSION_GROUP_GRADE_LEVEL_ORDER,
  SESSION_GROUP_GRADE_LEVEL_TOGGLE_OFF_CLASSES,
  SESSION_GROUP_GRADE_LEVEL_TOGGLE_ON_CLASSES,
} from "@/lib/constants/manager-session-group-grade-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { cn } from "@/lib/utils";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { UpdateSessionSettingsActionState } from "@/types/manager-class-session-detail";
import type { SessionGroupGradeLevelValue } from "@/types/manager-session-group-grade";
import type { ManagerSessionPhaseLink } from "@/types/manager-session-phase-link";

const initialState: UpdateSessionSettingsActionState = {};

type SaveTarget = "phase" | "groupGrade";

type SessionDetailsActionsProps = {
  classId: string;
  sessionId: string;
  linkedPhase: ManagerSessionPhaseLink | null;
  phaseOptions: ManagerSessionPhaseLink[];
  defaultPhaseId?: string | null;
  groupGradeLevel: SessionGroupGradeLevelValue | null;
  hasComputedGrades?: boolean;
  onSettingsUpdated: (
    session: ManagerClassSessionRow,
    linkedPhase?: ManagerSessionPhaseLink | null
  ) => void;
  className?: string;
};

function getInitialPhaseId(
  linkedPhase: ManagerSessionPhaseLink | null,
  defaultPhaseId: string | null | undefined,
  phaseOptions: ManagerSessionPhaseLink[]
) {
  if (linkedPhase?.phase_id) {
    return linkedPhase.phase_id;
  }

  if (
    defaultPhaseId &&
    phaseOptions.some((phase) => phase.phase_id === defaultPhaseId)
  ) {
    return defaultPhaseId;
  }

  return "";
}

export function SessionDetailsActions({
  classId,
  sessionId,
  linkedPhase,
  phaseOptions,
  defaultPhaseId,
  groupGradeLevel,
  hasComputedGrades = false,
  onSettingsUpdated,
  className,
}: SessionDetailsActionsProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateSessionSettingsAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const [saveTarget, setSaveTarget] = useState<SaveTarget | null>(null);
  const isPhasePending = isPending && saveTarget === "phase";
  const isGroupGradePending = isPending && saveTarget === "groupGrade";

  useActionStateToast(state, isPending);

  useActionStateSuccess(
    state,
    isPending,
    () => {
      setSaveTarget(null);
    },
    () => true
  );

  const initialPhaseId = useMemo(
    () => getInitialPhaseId(linkedPhase, defaultPhaseId, phaseOptions),
    [defaultPhaseId, linkedPhase, phaseOptions]
  );
  const phaseSelectItems = useMemo(
    () =>
      Object.fromEntries(
        phaseOptions.map((phase) => [phase.phase_id, phase.phase_name])
      ),
    [phaseOptions]
  );
  const [selectedPhaseId, setSelectedPhaseId] = useState(initialPhaseId);
  const [selectedGroupGrade, setSelectedGroupGrade] =
    useState<SessionGroupGradeLevelValue | null>(groupGradeLevel);
  const [phaseSyncKey, setPhaseSyncKey] = useState(initialPhaseId);
  const [groupGradeSyncKey, setGroupGradeSyncKey] = useState(
    groupGradeLevel ?? "none"
  );

  if (initialPhaseId !== phaseSyncKey) {
    setPhaseSyncKey(initialPhaseId);
    setSelectedPhaseId(initialPhaseId);
  }

  const nextGroupGradeSyncKey = groupGradeLevel ?? "none";
  if (nextGroupGradeSyncKey !== groupGradeSyncKey) {
    setGroupGradeSyncKey(nextGroupGradeSyncKey);
    setSelectedGroupGrade(groupGradeLevel);
  }

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.session) {
        return;
      }

      onSettingsUpdated(nextState.session, nextState.linkedPhase);
    },
    (nextState) => Boolean(nextState.success && nextState.session)
  );

  function handleSavePhase() {
    if (!selectedPhaseId) {
      return;
    }

    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("session_id", sessionId);
    formData.set("semester_id", selectedPhaseId);

    setSaveTarget("phase");
    startTransition(() => {
      formAction(formData);
    });
  }

  function handleSaveGroupGrade() {
    if (!selectedGroupGrade) {
      return;
    }

    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("session_id", sessionId);
    formData.set("group_grade_level", selectedGroupGrade);

    setSaveTarget("groupGrade");
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <ClassTabCollapsibleSection
      title="Session settings"
      description="Link this session to a phase and set the group grade level."
      storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.SESSION_DETAILS_SETTINGS}
      defaultOpen
    >
      <div className={cn("grid gap-6 px-4 pt-2 pb-3 lg:grid-cols-2", className)}>
        <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 ring-1 ring-foreground/8">
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
              <LayersIcon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Add to phase</h3>
              <p className="text-xs text-muted-foreground">
                {linkedPhase
                  ? `Linked to ${linkedPhase.phase_name}.`
                  : "Link this session to a semester phase (sessions.semester_id)."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="session-phase-select"
              label="Phase"
              hint={linkedPhase ? "Linked" : "Required to save"}
            />
            <Select
              value={selectedPhaseId || null}
              items={phaseSelectItems}
              disabled={isPending || hasComputedGrades}
              onValueChange={(value) => {
                if (value) {
                  setSelectedPhaseId(value);
                }
              }}
            >
              <SelectTrigger id="session-phase-select" className="w-full">
                <SelectValue placeholder="Select a phase" />
              </SelectTrigger>
              <SelectContent align="start">
                {phaseOptions.map((phase) => (
                  <SelectItem key={phase.phase_id} value={phase.phase_id}>
                    {phase.phase_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Can permission={PERMISSIONS.SESSIONS_UPDATE_SETTINGS}>
            <Button
              type="button"
              className="self-start"
              disabled={isPending || !selectedPhaseId || hasComputedGrades}
              onClick={handleSavePhase}
              title={
                hasComputedGrades
                  ? CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR
                  : undefined
              }
            >
              {isPhasePending ? <InlineSpinner /> : null}
              Save phase link
            </Button>
          </Can>
          {hasComputedGrades ? (
            <p className="text-xs text-muted-foreground">
              {CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 ring-1 ring-foreground/8">
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <UsersRoundIcon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Group grade</h3>
              <p className="text-xs text-muted-foreground">
                Set difficulty level (sessions.group_grade_level).
              </p>
            </div>
          </div>

          <fieldset
            className="flex flex-col gap-2"
            disabled={isPending || hasComputedGrades}
          >
            <legend className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-sm font-medium">
              <span>Level</span>
              <span className="text-xs font-normal text-muted-foreground">
                Choose one
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {SESSION_GROUP_GRADE_LEVEL_ORDER.map((level) => {
                const isSelected = selectedGroupGrade === level;

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
                    onClick={() => setSelectedGroupGrade(level)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      isSelected
                        ? SESSION_GROUP_GRADE_LEVEL_TOGGLE_ON_CLASSES[level]
                        : SESSION_GROUP_GRADE_LEVEL_TOGGLE_OFF_CLASSES[level]
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        SESSION_GROUP_GRADE_LEVEL_DOT_CLASSES[level],
                        isSelected ? "opacity-100" : "opacity-45"
                      )}
                      aria-hidden="true"
                    />
                    {SESSION_GROUP_GRADE_LEVEL_LABELS[level]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Can permission={PERMISSIONS.SESSIONS_UPDATE_SETTINGS}>
            <Button
              type="button"
              className="self-start"
              disabled={isPending || !selectedGroupGrade || hasComputedGrades}
              onClick={handleSaveGroupGrade}
              title={
                hasComputedGrades
                  ? CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR
                  : undefined
              }
            >
              {isGroupGradePending ? <InlineSpinner /> : null}
              Save group grade
            </Button>
          </Can>
          {hasComputedGrades ? (
            <p className="text-xs text-muted-foreground">
              {CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR}
            </p>
          ) : null}
        </div>
      </div>
    </ClassTabCollapsibleSection>
  );
}
