import { describe, expect, it } from "vitest";
import {
  findOverlappingScheduleSlot,
  scheduleSlotTimesOverlap,
} from "@/lib/manager/instructor-schedules/slot-overlap";

describe("scheduleSlotTimesOverlap", () => {
  it("detects overlapping intervals on the same day", () => {
    expect(
      scheduleSlotTimesOverlap(
        { day_of_week: 1, start_time: "09:00:00", end_time: "11:00:00" },
        { day_of_week: 1, start_time: "10:00:00", end_time: "12:00:00" }
      )
    ).toBe(true);
  });

  it("allows adjacent intervals", () => {
    expect(
      scheduleSlotTimesOverlap(
        { day_of_week: 1, start_time: "09:00:00", end_time: "10:00:00" },
        { day_of_week: 1, start_time: "10:00:00", end_time: "11:00:00" }
      )
    ).toBe(false);
  });

  it("ignores different weekdays", () => {
    expect(
      scheduleSlotTimesOverlap(
        { day_of_week: 1, start_time: "09:00:00", end_time: "11:00:00" },
        { day_of_week: 2, start_time: "09:00:00", end_time: "11:00:00" }
      )
    ).toBe(false);
  });
});

describe("findOverlappingScheduleSlot", () => {
  const rows = [
    {
      id: "a",
      day_of_week: 2,
      start_time: "09:00:00",
      end_time: "10:00:00",
    },
    {
      id: "b",
      day_of_week: 2,
      start_time: "11:00:00",
      end_time: "12:00:00",
    },
  ];

  it("returns the overlapping row", () => {
    expect(
      findOverlappingScheduleSlot(rows, {
        day_of_week: 2,
        start_time: "09:30:00",
        end_time: "10:30:00",
      })
    ).toEqual({ id: "a" });
  });

  it("excludes self by id", () => {
    expect(
      findOverlappingScheduleSlot(
        rows,
        { day_of_week: 2, start_time: "09:00:00", end_time: "10:00:00" },
        { excludeId: "a" }
      )
    ).toBeNull();
  });
});
