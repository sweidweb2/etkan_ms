"use client";

import {
  WEEKLY_SCHEDULE_SLOT_COLOR_LABELS,
  WEEKLY_SCHEDULE_SLOT_COLORS,
} from "@/lib/validators/manager/weekly-schedule-slot";
import type { WeeklyScheduleSlotColor } from "@/types/manager-weekly-schedule";
import { cn } from "@/lib/utils";

type ScheduleSlotColorPickerProps = {
  value: WeeklyScheduleSlotColor | string;
  onChange: (color: WeeklyScheduleSlotColor) => void;
  disabled?: boolean;
  invalid?: boolean;
};

export function ScheduleSlotColorPicker({
  value,
  onChange,
  disabled = false,
  invalid = false,
}: ScheduleSlotColorPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Slot color"
      aria-invalid={invalid || undefined}
      className="flex flex-wrap gap-2"
    >
      {WEEKLY_SCHEDULE_SLOT_COLORS.map((color) => {
        const selected = value === color;

        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={WEEKLY_SCHEDULE_SLOT_COLOR_LABELS[color]}
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
    </div>
  );
}
