"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type TaskYesNoFieldProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Shown instead of the default hint when the setting cannot change. */
  lockedReason?: string | null;
};

export function TaskYesNoField({
  id,
  checked,
  onCheckedChange,
  disabled,
  lockedReason,
}: TaskYesNoFieldProps) {
  const isLocked = Boolean(lockedReason);
  const hintId = `${id}-hint`;

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label htmlFor={id}>Yes/No task</Label>
        <p id={hintId} className="text-xs text-muted-foreground">
          {lockedReason ?? "Graded Yes (100) or No (0). Max grade is fixed at 100."}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled || isLocked}
        aria-describedby={hintId}
      />
    </div>
  );
}
