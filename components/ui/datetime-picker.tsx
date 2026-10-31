"use client";

import * as React from "react";
import {
  addMinutes,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getMonth,
  getYear,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  setHours,
  setMinutes,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function parseDateTimeLocal(value: string | undefined): Date | null {
  if (!value || !DATETIME_LOCAL_RE.test(value)) {
    return null;
  }
  const parsed = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateTimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function to12HourParts(date: Date): {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
} {
  const hour24 = date.getHours();
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, minute: date.getMinutes(), period };
}

function apply12Hour(
  date: Date,
  hour12: number,
  minute: number,
  period: "AM" | "PM"
): Date {
  let hour24 = hour12 % 12;
  if (period === "PM") {
    hour24 += 12;
  }
  return setMinutes(setHours(date, hour24), minute);
}

type DateTimePickerProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  "aria-invalid"?: boolean | "true" | "false";
  className?: string;
  placeholder?: string;
  /** Show Clear in the panel (for optional fields). */
  allowClear?: boolean;
  /** Minute stepper amount. Defaults to 5 for faster scheduling. */
  minuteStep?: number;
};

function DateTimePicker({
  id,
  name,
  value: valueProp,
  defaultValue = "",
  onChange,
  onBlur,
  disabled = false,
  "aria-invalid": ariaInvalid,
  className,
  placeholder = "Pick date and time",
  allowClear = false,
  minuteStep = 5,
}: DateTimePickerProps) {
  const isControlled = valueProp !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const value = isControlled ? (valueProp ?? "") : uncontrolled;
  const [open, setOpen] = React.useState(false);

  const selected = parseDateTimeLocal(value);
  const [viewMonth, setViewMonth] = React.useState(
    () => selected ?? new Date()
  );

  function commit(next: Date | null) {
    const nextValue = next ? toDateTimeLocal(next) : "";
    if (!isControlled) {
      setUncontrolled(nextValue);
    }
    onChange?.(nextValue);
  }

  function ensureBase(): Date {
    return selected ?? new Date();
  }

  function selectDay(day: Date) {
    const base = ensureBase();
    const parts = to12HourParts(base);
    commit(apply12Hour(day, parts.hour12, parts.minute, parts.period));
  }

  function setTimePart(
    patch: Partial<{ hour12: number; minute: number; period: "AM" | "PM" }>
  ) {
    const base = ensureBase();
    const current = to12HourParts(base);
    commit(
      apply12Hour(
        base,
        patch.hour12 ?? current.hour12,
        patch.minute ?? current.minute,
        patch.period ?? current.period
      )
    );
  }

  function stepHour(delta: number) {
    commit(addMinutes(ensureBase(), delta * 60));
  }

  function stepMinute(delta: number) {
    const step = Math.max(1, minuteStep);
    commit(addMinutes(ensureBase(), delta * step));
  }

  const monthStart = startOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const timeParts = selected ? to12HourParts(selected) : to12HourParts(new Date());
  const displayLabel = selected
    ? format(selected, "EEE, MMM d, yyyy · h:mm a")
    : null;

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const monthOptions = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const minutePresets = [0, 15, 30, 45];
  const currentYear = new Date().getFullYear();
  const viewedYear = getYear(viewMonth);
  const yearStart = Math.min(currentYear - 20, viewedYear);
  const yearEnd = Math.max(currentYear + 10, viewedYear);
  const yearOptions: number[] = [];
  for (let year = yearStart; year <= yearEnd; year += 1) {
    yearOptions.push(year);
  }

  const headerSelectClassName = cn(
    "h-7 max-w-full cursor-pointer rounded-md border border-transparent bg-transparent py-0 pl-1.5 pr-1 text-sm font-medium tabular-nums outline-none",
    "hover:border-border hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
  );

  return (
    <div className={cn("w-full", className)}>
      {name ? (
        <input type="hidden" name={name} value={value} readOnly />
      ) : null}

      <Popover
        open={open}
        onOpenChange={(next) => {
          if (disabled) {
            return;
          }
          if (next) {
            setViewMonth(selected ?? new Date());
          }
          setOpen(next);
          if (!next) {
            onBlur?.();
          }
        }}
      >
        <PopoverTrigger
          id={id}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            "flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base transition-colors outline-none md:text-sm",
            "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
            "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            "dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
            !displayLabel && "text-muted-foreground"
          )}
        >
          <CalendarDaysIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">
            {displayLabel ?? placeholder}
          </span>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="z-[70] w-[min(100vw-2rem,20.5rem)] gap-0 p-0"
        >
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-1 border-b border-border px-2 py-2.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Previous month"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
              >
                <ChevronLeftIcon />
              </Button>
              <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
                <label className="sr-only" htmlFor={id ? `${id}-month` : undefined}>
                  Month
                </label>
                <select
                  id={id ? `${id}-month` : undefined}
                  aria-label="Month"
                  className={headerSelectClassName}
                  value={getMonth(viewMonth)}
                  onChange={(event) => {
                    const month = Number(event.target.value);
                    setViewMonth((current) => setMonth(current, month));
                  }}
                >
                  {monthOptions.map((label, month) => (
                    <option key={label} value={month}>
                      {label}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor={id ? `${id}-year` : undefined}>
                  Year
                </label>
                <select
                  id={id ? `${id}-year` : undefined}
                  aria-label="Year"
                  className={headerSelectClassName}
                  value={viewedYear}
                  onChange={(event) => {
                    const year = Number(event.target.value);
                    setViewMonth((current) => setYear(current, year));
                  }}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Next month"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
              >
                <ChevronRightIcon />
              </Button>
            </div>

            <div className="px-3 pt-2 pb-1">
              <div className="mb-1 grid grid-cols-7 gap-0.5">
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="flex h-7 items-center justify-center text-[0.7rem] font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((day) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const isSelected = selected ? isSameDay(day, selected) : false;
                  const today = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={cn(
                        "relative flex h-8 items-center justify-center rounded-md text-sm tabular-nums transition-colors",
                        "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        !inMonth && "text-muted-foreground/45",
                        isSelected &&
                          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                        !isSelected && today && "font-semibold text-primary"
                      )}
                    >
                      {format(day, "d")}
                      {today && !isSelected ? (
                        <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Time
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => commit(new Date())}
                >
                  Now
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2">
                <TimeStepper
                  label="Hour"
                  value={String(timeParts.hour12).padStart(2, "0")}
                  onDecrement={() => stepHour(-1)}
                  onIncrement={() => stepHour(1)}
                />
                <span className="pt-1 text-xl font-semibold text-muted-foreground">
                  :
                </span>
                <TimeStepper
                  label="Minute"
                  value={String(timeParts.minute).padStart(2, "0")}
                  onDecrement={() => stepMinute(-1)}
                  onIncrement={() => stepMinute(1)}
                />
                <div
                  className="ml-1 flex flex-col justify-center gap-1 self-stretch py-6"
                  role="group"
                  aria-label="AM or PM"
                >
                  {(["AM", "PM"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setTimePart({ period })}
                      className={cn(
                        "h-8 min-w-11 rounded-md px-2.5 text-xs font-semibold transition-colors",
                        timeParts.period === period
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {minutePresets.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => setTimePart({ minute })}
                    className={cn(
                      "h-6 rounded-md px-2 text-xs tabular-nums transition-colors",
                      timeParts.minute === minute
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    :{String(minute).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-2">
              <div className="flex gap-1">
                {allowClear ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      commit(null);
                      setOpen(false);
                      onBlur?.();
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    setViewMonth(now);
                    selectDay(now);
                  }}
                >
                  Today
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  onBlur?.();
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function TimeStepper({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Increase ${label.toLowerCase()}`}
        onClick={onIncrement}
      >
        <ChevronUpIcon />
      </Button>
      <div className="flex min-w-12 flex-col items-center rounded-lg border border-border bg-background px-2 py-1.5">
        <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span className="text-lg font-semibold tabular-nums leading-none">
          {value}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Decrease ${label.toLowerCase()}`}
        onClick={onDecrement}
      >
        <ChevronDownIcon />
      </Button>
    </div>
  );
}

export { DateTimePicker, parseDateTimeLocal, toDateTimeLocal };
export type { DateTimePickerProps };
