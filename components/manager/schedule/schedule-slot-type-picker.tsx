"use client";

import type { ComponentType } from "react";
import {
  GraduationCapIcon,
  MonitorIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import {
  WEEKLY_SCHEDULE_SLOT_TYPE_LABELS,
  WEEKLY_SCHEDULE_SLOT_TYPE_VALUES,
} from "@/lib/validators/manager/weekly-schedule-slot";
import { cn } from "@/lib/utils";
import type { WeeklyScheduleSlotType } from "@/types/manager-weekly-schedule";

const TYPE_ICONS: Record<
  WeeklyScheduleSlotType,
  ComponentType<{ className?: string }>
> = {
  class: GraduationCapIcon,
  workshop: WrenchIcon,
  online: MonitorIcon,
  meeting: UsersIcon,
};

type ScheduleSlotTypePickerProps = {
  value: WeeklyScheduleSlotType | string;
  onChange: (type: WeeklyScheduleSlotType) => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
};

export function ScheduleSlotTypePicker({
  value,
  onChange,
  disabled = false,
  invalid = false,
  id,
}: ScheduleSlotTypePickerProps) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Slot type"
      aria-invalid={invalid || undefined}
      className="grid grid-cols-4 gap-1.5"
    >
      {WEEKLY_SCHEDULE_SLOT_TYPE_VALUES.map((type) => {
        const selected = value === type;
        const Icon = TYPE_ICONS[type];

        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(type)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-md border px-1.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground hover:bg-muted/60",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {WEEKLY_SCHEDULE_SLOT_TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
