"use client";

import { CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
};

export function Checkbox({
  checked,
  onCheckedChange,
  indeterminate = false,
  disabled,
  id,
  "aria-label": ariaLabel,
  className,
}: CheckboxProps) {
  const isMixed = indeterminate && !checked;

  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={isMixed ? "mixed" : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border shadow-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked || isMixed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-transparent",
        className
      )}
    >
      {checked ? <CheckIcon className="size-3" /> : null}
      {isMixed ? <MinusIcon className="size-3" /> : null}
    </button>
  );
}
