"use client";

import { YES_NO_GRADE, YES_NO_GRADE_LABELS } from "@/lib/constants/task-yes-no";
import { cn } from "@/lib/utils";

type YesNoGradeValue = "" | typeof YES_NO_GRADE.YES | typeof YES_NO_GRADE.NO;

type YesNoGradeControlProps = {
  id: string;
  name: string;
  value: string | number | undefined;
  onChange: (value: YesNoGradeValue) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

const OPTIONS: Array<{ key: string; label: string; value: YesNoGradeValue }> = [
  { key: "none", label: "Not graded", value: "" },
  { key: "yes", label: YES_NO_GRADE_LABELS.YES, value: YES_NO_GRADE.YES },
  { key: "no", label: YES_NO_GRADE_LABELS.NO, value: YES_NO_GRADE.NO },
];

function toSelectedKey(value: string | number | undefined): string | null {
  if (value === undefined || value === "") {
    return "none";
  }
  const numeric = Number(value);
  if (numeric === YES_NO_GRADE.YES) {
    return "yes";
  }
  if (numeric === YES_NO_GRADE.NO) {
    return "no";
  }
  return null;
}

export function YesNoGradeControl({
  id,
  name,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: YesNoGradeControlProps) {
  const selectedKey = toSelectedKey(value);

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Grade"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(
        "grid grid-cols-3 gap-1 rounded-lg border border-input p-1",
        invalid && "border-destructive",
        disabled && "opacity-50"
      )}
    >
      {OPTIONS.map((option) => {
        const isSelected = selectedKey === option.key;
        return (
          <label
            key={option.key}
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
              isSelected
                ? option.key === "yes"
                  ? "bg-emerald-600 text-white dark:bg-emerald-500"
                  : option.key === "no"
                    ? "bg-destructive text-white"
                    : "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60",
              disabled && "pointer-events-none"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.key}
              checked={isSelected}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
