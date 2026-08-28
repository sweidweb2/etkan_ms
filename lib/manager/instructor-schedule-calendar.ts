import { addDays, format, parseISO, startOfWeek } from "date-fns";
import type { EventInput } from "@fullcalendar/react";
import {
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
  getInstructorScheduleSlotStrongColor,
  INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type { ManagerInstructorScheduleSession } from "@/types/manager-instructor-schedule";

/** Optimistic create/copy ids before the server returns a real UUID. */
export const TEMP_SCHEDULE_ID_PREFIX = "__temp_";

export function isTempScheduleId(id: string): boolean {
  return id.startsWith(TEMP_SCHEDULE_ID_PREFIX);
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

function normalizeTimeForCalendar(value: string): string {
  const [hours = "00", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
}

function resolveEventColor(color: string | null | undefined): string {
  const value = (color ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value;
  }

  return INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR;
}

/** Project a recurring weekday onto the Sunday-start week containing weekStartIso. */
export function projectInstructorSlotDate(
  weekStartIso: string,
  dayOfWeek: number
): string {
  const [year, month, day] = weekStartIso.slice(0, 10).split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + dayOfWeek);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type ScheduleWorkshopBounds = {
  start_date: string | null;
  end_date: string | null;
};

export function isProjectedDateInWorkshopBounds(
  projectedDate: string,
  bounds: ScheduleWorkshopBounds | null | undefined
): boolean {
  if (!bounds) {
    return true;
  }

  if (bounds.start_date && projectedDate < bounds.start_date) {
    return false;
  }

  if (bounds.end_date && projectedDate >= bounds.end_date) {
    return false;
  }

  return true;
}

type InstructorScheduleSessionsToEventsOptions = {
  weekStart: string;
  entityLabelByKey?: Map<string, string>;
  workshopBoundsById?: Map<string, ScheduleWorkshopBounds>;
  includeEntityInTitle?: boolean;
};

function entityKey(
  entityType: ManagerInstructorScheduleSession["entityType"],
  recordId: string
) {
  return `${entityType}:${recordId}`;
}

export function instructorScheduleSessionsToEvents(
  sessions: ManagerInstructorScheduleSession[],
  options: InstructorScheduleSessionsToEventsOptions
): EventInput[] {
  const {
    weekStart,
    entityLabelByKey,
    workshopBoundsById,
    includeEntityInTitle = false,
  } = options;

  const events: EventInput[] = [];

  for (const session of sessions) {
    const projectedDate = projectInstructorSlotDate(
      weekStart,
      session.dayOfWeek
    );

    if (session.entityType === ENTITY_SCHEDULE_TYPE_WORKSHOP) {
      const bounds = workshopBoundsById?.get(session.recordId);
      if (!isProjectedDateInWorkshopBounds(projectedDate, bounds)) {
        continue;
      }
    }

    const color = resolveEventColor(session.color);
    const contrastColor = getInstructorScheduleSlotStrongColor(color);
    const startTime = normalizeTimeForCalendar(session.startTime);
    const endTime = normalizeTimeForCalendar(session.endTime);
    const isTemp = session.id.startsWith("__temp_");
    const isWorkshopMirror = Boolean(session.sourceWorkshopId);
    const canEditEvent = !isTemp && !isWorkshopMirror;
    const entityLabel =
      entityLabelByKey
        ?.get(entityKey(session.entityType, session.recordId))
        ?.trim() || null;
    const title =
      includeEntityInTitle && entityLabel
        ? `${entityLabel} · ${session.name}`
        : session.name;

    events.push({
      id: session.id,
      title,
      start: `${projectedDate}T${startTime}`,
      end: `${projectedDate}T${endTime}`,
      color,
      contrastColor,
      editable: canEditEvent,
      startEditable: canEditEvent,
      durationEditable: canEditEvent,
      extendedProps: {
        session,
        isTemp,
        isWorkshopMirror,
        projectedDate,
      },
    });
  }

  return events;
}
