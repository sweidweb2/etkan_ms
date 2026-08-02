"use client";

import { useRef } from "react";
import { PaletteIcon } from "lucide-react";
import {
  INSTRUCTOR_SCHEDULE_SLOT_COLOR_LABELS,
  INSTRUCTOR_SCHEDULE_SLOT_COLORS,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type { InstructorScheduleSlotPresetColor } from "@/types/manager-instructor-schedule";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type InstructorScheduleSlotColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  invalid?: boolean;
};

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return `#${trimmed.slice(1).toUpperCase()}`;
  }
  return trimmed;
}

export function InstructorScheduleSlotColorPicker({
  value,
  onChange,
  disabled = false,
  invalid = false,
}: InstructorScheduleSlotColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedValue = normalizeHex(value);
  const isCustom = !INSTRUCTOR_SCHEDULE_SLOT_COLORS.some(
    (color) => color.toLowerCase() === normalizedValue.toLowerCase()
  );

  return (
    <div
      role="radiogroup"
      aria-label="Slot color"
      aria-invalid={invalid || undefined}
      className="flex flex-wrap items-center gap-2"
    >
      {INSTRUCTOR_SCHEDULE_SLOT_COLORS.map((color) => {
        const selected =
          color.toLowerCase() === normalizedValue.toLowerCase();

        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={
              INSTRUCTOR_SCHEDULE_SLOT_COLOR_LABELS[
                color as InstructorScheduleSlotPresetColor
              ]
            }
            disabled={disabled}
            onClick={() => onChange(color)}
            className={cn(
              "size-8 rounded-full border-2 transition-[box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "scale-105 border-foreground shadow-sm"
                : "border-black/10 hover:scale-105",
              disabled && "cursor-not-allowed opacity-50"
            )}
            style={{ backgroundColor: color }}
          />
        );
      })}

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled}
          aria-label="Open color palette"
          aria-pressed={isCustom}
          className={cn(
            "rounded-full",
            isCustom && "ring-2 ring-foreground ring-offset-2"
          )}
          style={
            isCustom
              ? { backgroundColor: normalizedValue, borderColor: "transparent" }
              : undefined
          }
          onClick={() => inputRef.current?.click()}
        >
          <PaletteIcon
            className={cn(isCustom && "text-white drop-shadow-sm")}
          />
        </Button>
        <input
          ref={inputRef}
          type="color"
          value={
            /^#[0-9A-Fa-f]{6}$/.test(normalizedValue)
              ? normalizedValue
              : "#BAE6FD"
          }
          disabled={disabled}
          className="pointer-events-none absolute inset-0 size-0 opacity-0"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            onChange(normalizeHex(event.target.value));
          }}
        />
      </div>
    </div>
  );
}
