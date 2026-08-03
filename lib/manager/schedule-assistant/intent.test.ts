import { describe, expect, it } from "vitest";
import {
  analyzeScheduleAssistantIntent,
  extractWeekdaysFromText,
  weekdayFromYmd,
} from "@/lib/manager/schedule-assistant/intent";

describe("analyzeScheduleAssistantIntent", () => {
  it("detects schedule intent for subject + weekdays", () => {
    const intent = analyzeScheduleAssistantIntent(
      "I need instructors for an Arduino course free Friday and Tuesday"
    );
    expect(intent.hasScheduleIntent).toBe(true);
    expect(intent.weekdays).toEqual(["tuesday", "friday"]);
    expect(intent.subjectQuery).toContain("arduino");
  });

  it("refuses off-topic prompts", () => {
    expect(
      analyzeScheduleAssistantIntent("write me a poem about llamas")
        .hasScheduleIntent
    ).toBe(false);
  });

  it("keeps schedule half of mixed prompts", () => {
    const intent = analyzeScheduleAssistantIntent(
      "Arduino instructors free Tuesday and also write a poem"
    );
    expect(intent.hasScheduleIntent).toBe(true);
    expect(intent.weekdays).toContain("tuesday");
  });
});

describe("weekday helpers", () => {
  it("extracts aliases", () => {
    expect(extractWeekdaysFromText("mon tue friday")).toEqual([
      "monday",
      "tuesday",
      "friday",
    ]);
  });

  it("maps ymd", () => {
    expect(weekdayFromYmd("2026-08-07")).toBe("friday");
  });
});
