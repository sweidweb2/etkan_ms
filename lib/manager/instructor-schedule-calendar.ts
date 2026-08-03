import type { EventInput } from "@fullcalendar/react";
import {
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

type InstructorScheduleSessionsToEventsOptions = {
  weekStart: string;
  instructorNameById?: Map<string, string>;
  includeInstructorInTitle?: boolean;
};

export function instructorScheduleSessionsToEvents(
  sessions: ManagerInstructorScheduleSession[],
  options: InstructorScheduleSessionsToEventsOptions
): EventInput[] {
  const {
    weekStart,
    instructorNameById,
    includeInstructorInTitle = false,
  } = options;

  return sessions.map((session) => {
    const color = resolveEventColor(session.color);
    const contrastColor = getInstructorScheduleSlotStrongColor(color);
    const startTime = normalizeTimeForCalendar(session.startTime);
    const endTime = normalizeTimeForCalendar(session.endTime);
    const isTemp = session.id.startsWith("__temp_");
    const projectedDate = projectInstructorSlotDate(
      weekStart,
      session.dayOfWeek
    );
    const instructorLabel =
      instructorNameById?.get(session.recordId)?.trim() || null;
    const title =
      includeInstructorInTitle && instructorLabel
        ? `${instructorLabel} · ${session.name}`
        : session.name;

    return {
      id: session.id,
      title,
      start: `${projectedDate}T${startTime}`,
      end: `${projectedDate}T${endTime}`,
      color,
      contrastColor,
      editable: !isTemp,
      startEditable: !isTemp,
      durationEditable: !isTemp,
      extendedProps: {
        session,
        isTemp,
        projectedDate,
      },
    };
  });
}
