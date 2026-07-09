"use client";

import { useEffect, useState } from "react";
import { LayersIcon, UsersRoundIcon } from "lucide-react";
import { FieldLabel } from "@/components/auth/field-label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getManagerPhaseOptions } from "@/lib/constants/manager-session-phase-link-mock";
import {
  SESSION_GROUP_GRADE_LEVEL_DOT_CLASSES,
  SESSION_GROUP_GRADE_LEVEL_LABELS,
  SESSION_GROUP_GRADE_LEVEL_ORDER,
  SESSION_GROUP_GRADE_LEVEL_TOGGLE_CLASSES,
} from "@/lib/constants/manager-session-group-grade-display";
import { showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { SessionGroupGradeLevelValue } from "@/types/manager-session-group-grade";
import type { ManagerSessionPhaseLink } from "@/types/manager-session-phase-link";

type SessionDetailsActionsProps = {
  linkedPhase: ManagerSessionPhaseLink | null;
  defaultPhaseId?: string | null;
  groupGradeLevel: SessionGroupGradeLevelValue | null;
  onLinkPhase: (link: ManagerSessionPhaseLink) => void;
  onSaveGroupGrade: (level: SessionGroupGradeLevelValue) => void;
  className?: string;
};

export function SessionDetailsActions({
  linkedPhase,
  defaultPhaseId,
  groupGradeLevel,
  onLinkPhase,
  onSaveGroupGrade,
  className,
}: SessionDetailsActionsProps) {
  const phaseOptions = getManagerPhaseOptions();
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [selectedGroupGrade, setSelectedGroupGrade] =
    useState<SessionGroupGradeLevelValue | null>(groupGradeLevel);

  useEffect(() => {
    const options = getManagerPhaseOptions();
    const initialPhaseId =
      linkedPhase?.phase_id ??
      (defaultPhaseId && options.some((phase) => phase.id === defaultPhaseId)
        ? defaultPhaseId
        : "");

    setSelectedPhaseId(initialPhaseId);
  }, [defaultPhaseId, linkedPhase]);

  useEffect(() => {
    setSelectedGroupGrade(groupGradeLevel);
  }, [groupGradeLevel]);

  function handleSavePhase() {
    const phase = phaseOptions.find((row) => row.id === selectedPhaseId);

    if (!phase) {
      return;
    }

    onLinkPhase({
      phase_id: phase.id,
      phase_name: phase.name,
    });
    showSuccessToast(`Session linked to ${phase.name}.`);
  }

  function handleSaveGroupGrade() {
    if (!selectedGroupGrade) {
      return;
    }

    onSaveGroupGrade(selectedGroupGrade);
    showSuccessToast(
      `Group grade set to ${SESSION_GROUP_GRADE_LEVEL_LABELS[selectedGroupGrade]}.`
    );
  }

  return (
    <Card className={cn("py-0", className)}>
      <CardHeader className="border-b bg-muted/40 py-4">
        <CardTitle>Session settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 py-4 lg:grid-cols-2">
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
              disabled={!!linkedPhase}
              onValueChange={(value) => {
                if (value && !linkedPhase) {
                  setSelectedPhaseId(value);
                }
              }}
            >
              <SelectTrigger
                id="session-phase-select"
                className="w-full"
                disabled={!!linkedPhase}
              >
                <SelectValue placeholder="Select a phase" />
              </SelectTrigger>
              <SelectContent align="start">
                {phaseOptions.map((phase) => (
                  <SelectItem key={phase.id} value={phase.id}>
                    {phase.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            className="self-start"
            disabled={!!linkedPhase || !selectedPhaseId}
            onClick={handleSavePhase}
          >
            {linkedPhase ? "Phase linked" : "Save phase link"}
          </Button>
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

          <div className="flex flex-col gap-2">
            <FieldLabel label="Level" hint="Choose one" />
            <div className="flex flex-wrap gap-2">
              {SESSION_GROUP_GRADE_LEVEL_ORDER.map((level) => {
                const isSelected = selectedGroupGrade === level;

                return (
                  <button
                    key={level}
                    type="button"
                    data-state={isSelected ? "on" : "off"}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedGroupGrade(level)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      SESSION_GROUP_GRADE_LEVEL_TOGGLE_CLASSES[level]
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        SESSION_GROUP_GRADE_LEVEL_DOT_CLASSES[level],
                        isSelected ? "opacity-100" : "opacity-70"
                      )}
                      aria-hidden="true"
                    />
                    {SESSION_GROUP_GRADE_LEVEL_LABELS[level]}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="button"
            className="self-start"
            disabled={!selectedGroupGrade}
            onClick={handleSaveGroupGrade}
          >
            Save group grade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
