import type { EventInput } from "@fullcalendar/react";
import {
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
  getInstructorScheduleSlotStrongColor,
  INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type { ManagerInstructorScheduleSession } from "@/types/manager-instructor-schedule";

export {
  TEMP_SCHEDULE_ID_PREFIX,
  isTempScheduleId,
  formatTimeFromDate,
  formatDateFromDate,
  formatDateOnly,
  getSundayWeekBounds,
  type CreateSlotDefaults,
} from "@/lib/manager/weekly-schedule-calendar";

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
