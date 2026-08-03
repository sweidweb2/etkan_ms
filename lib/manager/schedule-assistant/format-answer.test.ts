import { describe, expect, it } from "vitest";
import { SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE } from "@/lib/constants/schedule-assistant";
import { buildAnswerFromGroups } from "@/lib/manager/schedule-assistant/answer";
import {
  buildSynthMessages,
  formatAnswerFromFacts,
} from "@/lib/manager/schedule-assistant/format-answer";
import type { ScheduleAssistantPrefetchCatalogs } from "@/types/schedule-assistant";

const catalogs: ScheduleAssistantPrefetchCatalogs = {
  instructors: {
    instructors: [
      { i: "1", u: "ali" },
      { i: "2", u: "bob" },
    ],
    truncated: false,
    total: 2,
  },
  subjects: {
    subjects: ["Arduino Basics", "Math"],
    truncated: false,
    total: 2,
  },
  matrix: {
    matrix: [
      { u: "ali", sub: ["Arduino Basics", "Math"] },
      { u: "bob", sub: ["Math"] },
    ],
    truncated: false,
    total: 2,
  },
  slots: {
    slots: [
      {
        i: "1",
        u: "ali",
        d: "2026-08-07",
        w: "friday",
        s: "09:00",
        e: "11:00",
      },
      {
        i: "2",
        u: "bob",
        d: "2026-08-07",
        w: "friday",
        s: "10:00",
        e: "12:00",
      },
    ],
    truncated: false,
    total: 2,
  },
};

describe("formatAnswerFromFacts", () => {
  it("formats capability lists", () => {
    expect(
      formatAnswerFromFacts({
        capabilities: {
          matches: [
            { u: "bob", sub: ["Math"] },
            { u: "ali", sub: ["Math", "Arduino Basics"] },
          ],
        },
      })
    ).toBe("ali: Arduino Basics, Math\nbob: Math");
  });

  it("formats free windows", () => {
    expect(
      formatAnswerFromFacts({
        availability: {
          usernames: ["ali", "bob"],
          slots: catalogs.slots!.slots,
        },
      })
    ).toBe(
      "ali: friday 2026-08-07 09:00–11:00\nbob: friday 2026-08-07 10:00–12:00"
    );
  });

  it("formats join matches", () => {
    expect(
      formatAnswerFromFacts({
        join: {
          matches: [{ u: "ali", sub: ["Arduino Basics"] }],
          slots: [catalogs.slots!.slots[0]!],
        },
      })
    ).toBe("ali (Arduino Basics): friday 2026-08-07 09:00–11:00");
  });

  it("returns no-match when empty", () => {
    expect(formatAnswerFromFacts({})).toBe(SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE);
    expect(
      formatAnswerFromFacts({
        capabilities: { matches: [] },
        availability: { slots: [], usernames: [] },
        join: { matches: [], slots: [] },
      })
    ).toBe(SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE);
  });
});

describe("buildAnswerFromGroups", () => {
  it("resolves capability groups into formatted answer", () => {
    const result = buildAnswerFromGroups(
      [
        {
          id: "g1",
          direction: "capability_to_username",
          usernames: [],
          subject_names: ["Arduino Basics"],
          weekdays: [],
          start_time: null,
          end_time: null,
        },
      ],
      catalogs
    );
    expect(result.answer).toBe("ali: Arduino Basics");
    expect(result.facts.capabilities?.matches).toHaveLength(1);
  });

  it("resolves join empty to no-match", () => {
    const result = buildAnswerFromGroups(
      [
        {
          id: "g1",
          direction: "subject_and_availability",
          usernames: [],
          subject_names: ["Arduino Basics"],
          weekdays: ["monday"],
          start_time: null,
          end_time: null,
        },
      ],
      catalogs
    );
    expect(result.answer).toBe(SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE);
  });

  it("resolves join non-empty with friday slots", () => {
    const result = buildAnswerFromGroups(
      [
        {
          id: "g1",
          direction: "subject_and_availability",
          usernames: [],
          subject_names: ["Arduino Basics"],
          weekdays: ["friday"],
          start_time: null,
          end_time: null,
        },
      ],
      catalogs
    );
    expect(result.answer).toBe(
      "ali (Arduino Basics): friday 2026-08-07 09:00–11:00"
    );
  });
});

describe("buildSynthMessages", () => {
  it("builds Q/DATA user payload", () => {
    const messages = buildSynthMessages("Who teaches Arduino?", {
      capabilities: { matches: [{ u: "ali", sub: ["Arduino Basics"] }] },
    });
    expect(messages.user).toContain("Q: Who teaches Arduino?");
    expect(messages.user).toContain("DATA:");
    expect(messages.system).toMatch(/ONLY the DATA JSON/i);
  });
});
