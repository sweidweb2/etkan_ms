import { describe, expect, it } from "vitest";
import { CLASS_WEEK_SKIP_BLOCKED_REASONS } from "@/lib/constants/class-session-skips";
import {
  addDaysToIsoDate,
  buildClassWeekSkipState,
  countConsecutiveSkippedWeeks,
  toAppIsoDate,
  type BuildClassWeekSkipStateInput,
} from "@/lib/manager/class-week-skips";

// Thursday 2026-11-05 12:00 Asia/Beirut.
const NOW = new Date("2026-11-05T10:00:00.000Z");

const pastSession = {
  id: "s1",
  starts_at: "2026-10-31T08:00:00.000Z",
  ends_at: "2026-11-07T08:00:00.000Z",
  session_report: null,
};

const upcomingSession = {
  id: "s2",
  starts_at: "2026-11-07T08:00:00.000Z",
  ends_at: "2026-11-14T08:00:00.000Z",
  session_report: null,
};

function build(overrides: Partial<BuildClassWeekSkipStateInput> = {}) {
  return buildClassWeekSkipState({
    now: NOW,
    isTeacher: true,
    classInProgress: true,
    hasComputedGrades: false,
    plannedSessions: null,
    sessions: [pastSession, upcomingSession],
    skips: [],
    latestSessionHasAttendanceChanges: false,
    ...overrides,
  });
}

describe("date helpers", () => {
  it("formats dates in Asia/Beirut", () => {
    expect(toAppIsoDate(new Date("2026-11-05T22:30:00.000Z"))).toBe(
      "2026-11-06"
    );
  });

  it("adds days across month boundaries", () => {
    expect(addDaysToIsoDate("2026-11-28", 7)).toBe("2026-12-05");
    expect(addDaysToIsoDate("2026-12-05", -7)).toBe("2026-11-28");
  });

  it("counts the skipped run a date would join", () => {
    const skipped = new Set(["2026-11-14", "2026-11-28"]);
    expect(countConsecutiveSkippedWeeks("2026-11-21", skipped)).toBe(3);
    expect(countConsecutiveSkippedWeeks("2026-12-12", skipped)).toBe(1);
  });
});

describe("buildClassWeekSkipState", () => {
  it("is empty when the class is not in progress, grades are locked, or has no sessions", () => {
    expect(build({ classInProgress: false })).toEqual({
      weeks: [],
      latestSession: null,
    });
    expect(build({ hasComputedGrades: true }).weeks).toEqual([]);
    expect(build({ sessions: [] }).latestSession).toBeNull();
  });

  it("lists weekly slots after the latest session within the skip horizon", () => {
    const state = build();

    expect(state.weeks.map((week) => week.date)).toEqual([
      "2026-11-14",
      "2026-11-21",
      "2026-11-28",
    ]);
    expect(state.weeks.every((week) => week.canSkip)).toBe(true);
    expect(state.latestSession).toEqual({
      sessionId: "s2",
      date: "2026-11-07",
      canSkip: true,
      blockedReason: null,
    });
  });

  it("blocks skipping the latest session once it has a report or attendance changes", () => {
    expect(
      build({
        sessions: [pastSession, { ...upcomingSession, session_report: "Done" }],
      }).latestSession?.blockedReason
    ).toBe(CLASS_WEEK_SKIP_BLOCKED_REASONS.SESSION_STARTED_WORK);

    expect(
      build({ latestSessionHasAttendanceChanges: true }).latestSession?.canSkip
    ).toBe(false);
  });

  it("does not offer skipping an ended latest session", () => {
    const endedSession = {
      id: "s0",
      starts_at: "2026-10-24T08:00:00.000Z",
      ends_at: "2026-10-31T08:00:00.000Z",
      session_report: null,
    };
    expect(build({ sessions: [endedSession] }).latestSession).toBeNull();
  });

  it("limits teachers to two consecutive skipped weeks but not managers", () => {
    const skips = [
      { skip_date: "2026-11-14", reason: null },
      { skip_date: "2026-11-21", reason: "Holiday" },
    ];

    const teacher = build({ skips });
    const week = teacher.weeks.find((entry) => entry.date === "2026-11-28");
    expect(week?.canSkip).toBe(false);
    expect(week?.blockedReason).toBe(
      CLASS_WEEK_SKIP_BLOCKED_REASONS.CONSECUTIVE_LIMIT
    );
    expect(teacher.latestSession?.canSkip).toBe(false);
    expect(
      teacher.weeks.find((entry) => entry.date === "2026-11-21")
    ).toMatchObject({ skipped: true, canUnskip: true, skipReason: "Holiday" });

    const manager = build({ skips, isTeacher: false });
    expect(
      manager.weeks.find((entry) => entry.date === "2026-11-28")?.canSkip
    ).toBe(true);
    expect(manager.latestSession?.canSkip).toBe(true);
  });

  it("stops listing weeks once the subject's planned sessions are covered", () => {
    const state = build({
      plannedSessions: 3,
      skips: [{ skip_date: "2026-11-14", reason: null }],
    });

    expect(state.weeks.map((week) => [week.date, week.skipped])).toEqual([
      ["2026-11-14", true],
      ["2026-11-21", false],
    ]);
    expect(build({ plannedSessions: 2 }).weeks).toEqual([]);
  });
});
