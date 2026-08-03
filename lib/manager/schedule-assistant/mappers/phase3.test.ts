import { describe, expect, it } from "vitest";
import { parseMapperGroupsResult } from "@/lib/manager/schedule-assistant/mappers/parse";
import { parseCapabilitiesMapperResult } from "@/lib/manager/schedule-assistant/mappers/capabilities";
import { parseAvailabilityMapperResult } from "@/lib/manager/schedule-assistant/mappers/availability";
import { parseJoinMapperResult } from "@/lib/manager/schedule-assistant/mappers/join";
import { scrubGroups } from "@/lib/manager/schedule-assistant/scrub";
import {
  resolveAvailabilityGroup,
  resolveJoinGroup,
} from "@/lib/manager/schedule-assistant/resolve-groups";
import { tryExactFastPath } from "@/lib/manager/schedule-assistant/fast-path";
import { mapGroupsForRoute } from "@/lib/manager/schedule-assistant/map-route";
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
    subjects: ["Arduino", "Arduino Basics", "Math"],
    truncated: false,
    total: 3,
  },
  matrix: {
    matrix: [
      { u: "ali", sub: ["Arduino Basics"] },
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
      {
        i: "1",
        u: "ali",
        d: "2026-08-03",
        w: "monday",
        s: "13:00",
        e: "15:00",
      },
    ],
    truncated: false,
    total: 3,
  },
};

describe("parseMapperGroupsResult", () => {
  it("parses capability groups and drops wrong directions", () => {
    const groups = parseCapabilitiesMapperResult(
      JSON.stringify({
        groups: [
          {
            direction: "capability_to_username",
            usernames: [],
            subject_names: ["Arduino Basics"],
          },
          {
            direction: "slots_to_username",
            usernames: [],
            weekdays: ["friday"],
          },
        ],
      })
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.direction).toBe("capability_to_username");
  });

  it("repairs markdown-wrapped availability JSON", () => {
    const groups = parseAvailabilityMapperResult(
      '```json\n{"groups":[{"direction":"slots_to_username","weekdays":["friday"]}]}\n```'
    );
    expect(groups[0]?.direction).toBe("slots_to_username");
    expect(groups[0]?.weekdays).toEqual(["friday"]);
  });

  it("parses join direction only", () => {
    const groups = parseJoinMapperResult(
      JSON.stringify({
        groups: [
          {
            direction: "subject_and_availability",
            subject_names: ["Arduino Basics"],
            weekdays: ["friday"],
          },
          {
            direction: "username_to_capability",
            usernames: ["ali"],
          },
        ],
      })
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.direction).toBe("subject_and_availability");
  });

  it("returns empty on invalid JSON", () => {
    expect(parseMapperGroupsResult("nope", "capabilities")).toEqual([]);
  });
});

describe("scrubGroups", () => {
  it("drops invented usernames and subjects", () => {
    const scrubbed = scrubGroups(
      [
        {
          id: "g1",
          direction: "capability_to_username",
          usernames: ["ali", "ghost"],
          subject_names: ["Arduino Basics", "MadeUp"],
          weekdays: ["friday"],
          start_time: null,
          end_time: null,
        },
      ],
      catalogs
    );
    expect(scrubbed[0]?.usernames).toEqual(["ali"]);
    expect(scrubbed[0]?.subject_names).toEqual(["Arduino Basics"]);
  });
});

describe("resolve groups", () => {
  it("filters availability by weekday and time window", () => {
    const result = resolveAvailabilityGroup(
      {
        id: "g1",
        direction: "slots_to_username",
        usernames: [],
        subject_names: [],
        weekdays: ["friday"],
        start_time: "09:00",
        end_time: "09:30",
      },
      catalogs
    );
    expect(result.slots).toHaveLength(1);
    expect(result.slots[0]?.u).toBe("ali");
    expect(result.usernames).toEqual(["ali"]);
  });

  it("intersects join: Arduino instructors free Friday keeps ali only", () => {
    const result = resolveJoinGroup(
      {
        id: "g1",
        direction: "subject_and_availability",
        usernames: [],
        subject_names: ["Arduino Basics"],
        weekdays: ["friday"],
        start_time: null,
        end_time: null,
      },
      catalogs
    );
    expect(result.matches.map((row) => row.u)).toEqual(["ali"]);
    expect(result.slots.every((slot) => slot.u === "ali")).toBe(true);
    expect(result.slots.some((slot) => slot.u === "bob")).toBe(false);
  });
});

describe("tryExactFastPath / mapGroupsForRoute", () => {
  it("skips LLM-2 for exact username on capabilities", () => {
    const hit = tryExactFastPath({
      route: "capabilities",
      hints: {
        weekdays: [],
        subject_tokens: [],
        username_tokens: ["ali"],
      },
      catalogs,
    });
    expect(hit?.skipped_llm2).toBe(true);
    expect(hit?.groups[0]?.direction).toBe("username_to_capability");
    expect(hit?.groups[0]?.usernames).toEqual(["ali"]);
  });

  it("returns null when capabilities is ambiguous (user + subject)", () => {
    expect(
      tryExactFastPath({
        route: "capabilities",
        hints: {
          weekdays: [],
          subject_tokens: ["Arduino"],
          username_tokens: ["ali"],
        },
        catalogs,
      })
    ).toBeNull();
  });

  it("fast-path join when subject token exactly matches catalog", () => {
    const mapped = mapGroupsForRoute({
      route: "capability_availability",
      hints: {
        weekdays: ["friday"],
        subject_tokens: ["Arduino"],
        username_tokens: [],
      },
      catalogs,
    });
    expect(mapped.skipped_llm2).toBe(true);
    if (mapped.skipped_llm2) {
      expect(mapped.groups[0]?.direction).toBe("subject_and_availability");
      expect(mapped.groups[0]?.subject_names).toEqual(["Arduino"]);
      expect(mapped.groups[0]?.weekdays).toEqual(["friday"]);
    }
  });

  it("misses fast-path when no exact catalog match", () => {
    const mapped = mapGroupsForRoute({
      route: "capabilities",
      hints: {
        weekdays: [],
        subject_tokens: ["robotics-xyz"],
        username_tokens: [],
      },
      catalogs,
    });
    expect(mapped.skipped_llm2).toBe(false);
    expect(mapped.groups).toBeNull();
  });
});
