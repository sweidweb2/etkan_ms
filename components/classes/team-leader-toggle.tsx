"use client";

import { useRef, useState } from "react";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Switch } from "@/components/ui/switch";
import { useActionStateSettled } from "@/hooks/use-action-state-settled";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import type { SetTeamLeaderActionState } from "@/types/manager-class-detail";

export type SetTeamLeaderAction = (
  prevState: SetTeamLeaderActionState,
  formData: FormData
) => Promise<SetTeamLeaderActionState>;

const initialState: SetTeamLeaderActionState = {};

type TeamLeaderToggleProps = {
  classId: string;
  studentClassId: string;
  studentName: string;
  isTeamLeader: boolean;
  action: SetTeamLeaderAction;
  onChange?: (studentClassId: string, isTeamLeader: boolean) => void;
};

export function TeamLeaderToggle({
  classId,
  studentClassId,
  studentName,
  isTeamLeader,
  action,
  onChange,
}: TeamLeaderToggleProps) {
  const [state, formAction, isPending] = useFormActionState(
    action,
    initialState
  );
  const [checked, setChecked] = useState(isTeamLeader);
  const confirmedRef = useRef(isTeamLeader);

  useActionStateToast(state, isPending);
  useActionStateSettled(
    state,
    isPending,
    (next) => next.success === true || Boolean(next.error),
    (next) => {
      if (next.success && typeof next.isTeamLeader === "boolean") {
        confirmedRef.current = next.isTeamLeader;
        setChecked(next.isTeamLeader);
        onChange?.(studentClassId, next.isTeamLeader);
        return;
      }
      setChecked(confirmedRef.current);
    }
  );

  const handleCheckedChange = (nextChecked: boolean) => {
    setChecked(nextChecked);
    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("student_class_id", studentClassId);
    formData.set("is_team_leader", String(nextChecked));
    formAction(formData);
  };

  return (
    <span className="inline-flex items-center gap-2">
      <Switch
        checked={checked}
        onCheckedChange={handleCheckedChange}
        disabled={isPending}
        aria-label={
          checked
            ? `Remove team leader role from ${studentName}`
            : `Make ${studentName} team leader`
        }
      />
      {isPending ? <InlineSpinner className="size-3.5" /> : null}
    </span>
  );
}
