import type { InstructorScheduleSlotRecord } from "@/repositories/instructor-schedule-slot.repository";

export const SCHEDULE_SLOT_OVERLAP_MESSAGE =
  "This time overlaps an existing schedule slot.";

export type ScheduleSlotTimeRange = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

/** Half-open style overlap: startA < endB && startB < endA (same day). */
export function scheduleSlotTimesOverlap(
  a: ScheduleSlotTimeRange,
  b: ScheduleSlotTimeRange
): boolean {
  if (a.day_of_week !== b.day_of_week) {
    return false;
  }
  const aStart = normalizeTime(a.start_time);
  const aEnd = normalizeTime(a.end_time);
  const bStart = normalizeTime(b.start_time);
  const bEnd = normalizeTime(b.end_time);
  return aStart < bEnd && bStart < aEnd;
}

export function findOverlappingScheduleSlot(
  candidates: Pick<
    InstructorScheduleSlotRecord,
    "id" | "day_of_week" | "start_time" | "end_time"
  >[],
  candidate: ScheduleSlotTimeRange,
  options?: { excludeId?: string }
): { id: string } | null {
  for (const row of candidates) {
    if (options?.excludeId && row.id === options.excludeId) {
      continue;
    }
    if (
      scheduleSlotTimesOverlap(candidate, {
        day_of_week: row.day_of_week,
        start_time: row.start_time,
        end_time: row.end_time,
      })
    ) {
      return { id: row.id };
    }
  }
  return null;
}
