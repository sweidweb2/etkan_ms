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

export function instructorScheduleSessionsToEvents(
  sessions: ManagerInstructorScheduleSession[]
): EventInput[] {
  return sessions.map((session) => {
    const color = resolveEventColor(session.color);
    const contrastColor = getInstructorScheduleSlotStrongColor(color);
    const startTime = normalizeTimeForCalendar(session.startTime);
    const endTime = normalizeTimeForCalendar(session.endTime);
    const isTemp = session.id.startsWith("__temp_");

    return {
      id: session.id,
      title: session.name,
      start: `${session.slotDate}T${startTime}`,
      end: `${session.slotDate}T${endTime}`,
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
