import { addDays, format, parseISO, startOfWeek } from "date-fns";
import type { EventInput } from "@fullcalendar/react";
import {
  getWeeklyScheduleSlotStrongColor,
  WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR,
} from "@/lib/validators/manager/weekly-schedule-slot";
import type { ManagerWeeklyScheduleSession } from "@/types/manager-weekly-schedule";

/** Optimistic create/copy ids before the server returns a real UUID. */
export const TEMP_SCHEDULE_ID_PREFIX = "__temp_";

export function isTempScheduleId(id: string): boolean {
  return id.startsWith(TEMP_SCHEDULE_ID_PREFIX);
}

function normalizeTimeForCalendar(value: string): string {
  const [hours = "00", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
}

function resolveEventColor(color: string | null | undefined): string {
  const value = (color ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value;
  }

  return WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR;
}

export function weeklyScheduleSessionsToEvents(
  sessions: ManagerWeeklyScheduleSession[]
): EventInput[] {
  return sessions.map((session) => {
    const color = resolveEventColor(session.color);
    const contrastColor = getWeeklyScheduleSlotStrongColor(color);
    const startTime = normalizeTimeForCalendar(session.startTime);
    const endTime = normalizeTimeForCalendar(session.endTime);
    const isTemp = isTempScheduleId(session.id);

    return {
      id: session.id,
      title: session.name,
      start: `${session.slotDate}T${startTime}`,
      end: `${session.slotDate}T${endTime}`,
      // Monarch: pastel fill + strong contrast for title/time text.
      color,
      contrastColor,
      editable: !isTemp,
      startEditable: !isTemp,
      durationEditable: !isTemp,
      extendedProps: {
        session,
        isTemp,
      },
    };
  });
}

export function formatTimeFromDate(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDateFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateOnly(value: string | Date): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return format(value, "yyyy-MM-dd");
}

/** Sunday-start week containing the given ISO date (or any day in that week). */
export function getSundayWeekBounds(weekAnchorIso: string): {
  weekStart: string;
  weekEnd: string;
  lastWeekStart: string;
  lastWeekEnd: string;
} {
  const anchor = parseISO(formatDateOnly(weekAnchorIso));
  const weekStartDate = startOfWeek(anchor, { weekStartsOn: 0 });
  const weekEndDate = addDays(weekStartDate, 6);
  const lastWeekStartDate = addDays(weekStartDate, -7);
  const lastWeekEndDate = addDays(weekStartDate, -1);

  return {
    weekStart: format(weekStartDate, "yyyy-MM-dd"),
    weekEnd: format(weekEndDate, "yyyy-MM-dd"),
    lastWeekStart: format(lastWeekStartDate, "yyyy-MM-dd"),
    lastWeekEnd: format(lastWeekEndDate, "yyyy-MM-dd"),
  };
}

export type CreateSlotDefaults = {
  slot_date: string;
  start_time: string;
  end_time: string;
};
