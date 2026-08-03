import { describe, expect, it } from "vitest";
import {
  SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE,
  SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH,
  SCHEDULE_ASSISTANT_REFUSAL_MESSAGE,
  type ScheduleAssistantActiveRoute,
} from "@/lib/constants/schedule-assistant";
import { buildAnswerFromGroups } from "@/lib/manager/schedule-assistant/answer";
import {
  finalizeMapperGroups,
  mapGroupsForRoute,
} from "@/lib/manager/schedule-assistant/map-route";
import {
  heuristicRouteFromPrompt,
  resolveScheduleAssistantRouterResult,
} from "@/lib/manager/schedule-assistant/router";
import { scrubGroups } from "@/lib/manager/schedule-assistant/scrub";
import type {
  ScheduleAssistantGroup,
  ScheduleAssistantHints,
} from "@/lib/validators/manager/schedule-assistant";
import { scheduleAssistantPromptSchema } from "@/lib/validators/manager/schedule-assistant";
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

function answerForRoute(input: {
  route: ScheduleAssistantActiveRoute;
  hints: ScheduleAssistantHints;
  llm2Raw?: string;
}): string {
  const mapped = mapGroupsForRoute({
    route: input.route,
    hints: input.hints,
    catalogs,
  });

  let groups: ScheduleAssistantGroup[];
  if (mapped.skipped_llm2) {
    groups = mapped.groups;
  } else {
    groups = finalizeMapperGroups({
      route: input.route,
      raw: input.llm2Raw ?? "",
      catalogs,
    });
  }

  return buildAnswerFromGroups(groups, catalogs).answer;
}

describe("Phase 7 QA — router → map → answer", () => {
  it("Who teaches Arduino? → capabilities → names", () => {
    const routed = resolveScheduleAssistantRouterResult(
      JSON.stringify({
        route: "capabilities",
        hints: {
          weekdays: [],
          subject_tokens: ["arduino"],
          username_tokens: [],
        },
      }),
      "Who teaches Arduino?"
    );
    expect(routed.route).toBe("capabilities");

    const answer = answerForRoute({
      route: "capabilities",
      hints: routed.hints,
    });
    expect(answer).toMatch(/ali/i);
    expect(answer).toMatch(/Arduino Basics/i);
    expect(answer).not.toMatch(/bob/i);
  });

  it("What can <username> teach? → capabilities → subjects", () => {
    const routed = resolveScheduleAssistantRouterResult(
      JSON.stringify({
        route: "capabilities",
        hints: {
          weekdays: [],
          subject_tokens: [],
          username_tokens: ["ali"],
        },
      }),
      "What can ali teach?"
    );
    expect(routed.route).toBe("capabilities");

    const answer = answerForRoute({
      route: "capabilities",
      hints: routed.hints,
    });
    expect(answer).toMatch(/ali/i);
    expect(answer).toMatch(/Arduino Basics/i);
  });

  it("Who is free Friday? → availability", () => {
    const routed = resolveScheduleAssistantRouterResult(
      "",
      "Who is free Friday?"
    );
    expect(routed.route).toBe("availability");
    expect(routed.hints.weekdays).toEqual(["friday"]);

    const answer = answerForRoute({
      route: "availability",
      hints: routed.hints,
    });
    expect(answer).toMatch(/ali/i);
    expect(answer).toMatch(/bob/i);
    expect(answer).toMatch(/friday/i);
  });

  it("When is <username> free? → availability", () => {
    const routed = resolveScheduleAssistantRouterResult(
      JSON.stringify({
        route: "availability",
        hints: {
          weekdays: [],
          subject_tokens: [],
          username_tokens: ["ali"],
        },
      }),
      "When is ali free?"
    );
    expect(routed.route).toBe("availability");

    const answer = answerForRoute({
      route: "availability",
      hints: routed.hints,
    });
    expect(answer).toMatch(/ali/i);
    expect(answer).not.toMatch(/bob/i);
    expect(answer).toMatch(/friday|monday/i);
  });

  it("Arduino instructors free Friday. → join → intersected free slots", () => {
    const routed = resolveScheduleAssistantRouterResult(
      "",
      "Arduino instructors free Friday."
    );
    expect(routed.route).toBe("capability_availability");

    const answer = answerForRoute({
      route: "capability_availability",
      hints: {
        weekdays: ["friday"],
        subject_tokens: ["Arduino"],
        username_tokens: [],
      },
    });
    expect(answer).toMatch(/ali/i);
    expect(answer).not.toMatch(/bob/i);
    expect(answer).toMatch(/friday/i);
  });

  it("Off-topic → canned refuse", () => {
    const routed = resolveScheduleAssistantRouterResult(
      JSON.stringify({
        route: "refuse",
        hints: { weekdays: [], subject_tokens: [], username_tokens: [] },
      }),
      "write me a poem about llamas"
    );
    expect(routed.route).toBe("refuse");
    expect(heuristicRouteFromPrompt("write me a poem about llamas")).toBeNull();
    expect(SCHEDULE_ASSISTANT_REFUSAL_MESSAGE.length).toBeGreaterThan(0);
  });

  it("Typo subject → empty or catalog-only (never invents)", () => {
    const scrubbed = scrubGroups(
      [
        {
          id: "g1",
          direction: "capability_to_username",
          usernames: [],
          subject_names: ["TotallyFakeSubjectXYZ", "NotARealSubject"],
          weekdays: [],
          start_time: null,
          end_time: null,
        },
      ],
      catalogs
    );
    expect(scrubbed[0]?.subject_names).toEqual([]);

    const answer = answerForRoute({
      route: "capabilities",
      hints: {
        weekdays: [],
        subject_tokens: ["robotics-xyz-typo"],
        username_tokens: [],
      },
      llm2Raw: JSON.stringify({
        groups: [
          {
            direction: "capability_to_username",
            subject_names: ["InventedSubjectXYZ"],
          },
        ],
      }),
    });
    expect(answer).toBe(SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE);
    expect(answer).not.toMatch(/InventedSubjectXYZ/i);
  });
});

describe("Phase 7 QA — prompt length Zod", () => {
  it("accepts prompt at 300 chars; rejects 301", () => {
    expect(
      scheduleAssistantPromptSchema.safeParse({
        prompt: "a".repeat(SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH),
      }).success
    ).toBe(true);
    expect(
      scheduleAssistantPromptSchema.safeParse({
        prompt: "a".repeat(SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH + 1),
      }).success
    ).toBe(false);
  });
});
