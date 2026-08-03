import { describe, expect, it } from "vitest";
import {
  buildRouterMessages,
  heuristicRouteFromPrompt,
  parseScheduleAssistantRouterResult,
  resolveScheduleAssistantRouterResult,
} from "@/lib/manager/schedule-assistant/router";
import { SCHEDULE_ASSISTANT_ROUTER_SYSTEM_PROMPT } from "@/lib/manager/schedule-assistant/system-prompt";

describe("parseScheduleAssistantRouterResult", () => {
  it("parses valid JSON route + hints", () => {
    const result = parseScheduleAssistantRouterResult(
      JSON.stringify({
        route: "capabilities",
        hints: {
          weekdays: [],
          subject_tokens: ["arduino"],
          username_tokens: [],
        },
      })
    );
    expect(result.route).toBe("capabilities");
    expect(result.hints.subject_tokens).toEqual(["arduino"]);
  });

  it("repairs markdown-wrapped JSON", () => {
    const result = parseScheduleAssistantRouterResult(
      '```json\n{"route":"availability","hints":{"weekdays":["friday"],"subject_tokens":[],"username_tokens":[]}}\n```'
    );
    expect(result.route).toBe("availability");
    expect(result.hints.weekdays).toEqual(["friday"]);
  });

  it("refuses invalid JSON", () => {
    expect(parseScheduleAssistantRouterResult("not json")).toEqual({
      route: "refuse",
      hints: {
        weekdays: [],
        subject_tokens: [],
        username_tokens: [],
      },
    });
  });

  it("accepts ideal fixture for Arduino Friday join", () => {
    const result = parseScheduleAssistantRouterResult(
      JSON.stringify({
        route: "capability_availability",
        hints: {
          weekdays: ["friday"],
          subject_tokens: ["arduino"],
          username_tokens: [],
        },
      })
    );
    expect(result.route).toBe("capability_availability");
    expect(result.hints.weekdays).toEqual(["friday"]);
    expect(result.hints.subject_tokens).toEqual(["arduino"]);
  });
});

describe("heuristicRouteFromPrompt", () => {
  it("routes Arduino free Friday as capability_availability", () => {
    const result = heuristicRouteFromPrompt(
      "Arduino instructors free Friday."
    );
    expect(result?.route).toBe("capability_availability");
    expect(result?.hints.weekdays).toEqual(["friday"]);
    expect(result?.hints.subject_tokens).toContain("arduino");
  });

  it("routes capability-only asks", () => {
    expect(heuristicRouteFromPrompt("Who teaches Arduino?")?.route).toBe(
      "capabilities"
    );
  });

  it("routes availability-only asks", () => {
    expect(heuristicRouteFromPrompt("Who is free Friday?")?.route).toBe(
      "availability"
    );
  });

  it("returns null for off-topic", () => {
    expect(heuristicRouteFromPrompt("write me a poem")).toBeNull();
  });
});

describe("resolveScheduleAssistantRouterResult", () => {
  it("uses heuristic when JSON is truncated for Arduino Friday", () => {
    const result = resolveScheduleAssistantRouterResult(
      '{"route":"capability_availability","hints":{"weekdays":["fri',
      "Arduino instructors free Friday."
    );
    expect(result.route).toBe("capability_availability");
    expect(result.hints.weekdays).toEqual(["friday"]);
    expect(result.hints.subject_tokens).toContain("arduino");
  });

  it("overrides false refuse with heuristic for in-scope prompts", () => {
    const result = resolveScheduleAssistantRouterResult(
      JSON.stringify({
        route: "refuse",
        hints: { weekdays: [], subject_tokens: [], username_tokens: [] },
      }),
      "Arduino instructors free Friday."
    );
    expect(result.route).toBe("capability_availability");
  });

  it("keeps refuse for off-topic prompts", () => {
    const result = resolveScheduleAssistantRouterResult(
      JSON.stringify({
        route: "refuse",
        hints: { weekdays: [], subject_tokens: [], username_tokens: [] },
      }),
      "write me a poem about llamas"
    );
    expect(result.route).toBe("refuse");
  });

  it("keeps non-refuse parsed routes", () => {
    const result = resolveScheduleAssistantRouterResult(
      JSON.stringify({
        route: "capabilities",
        hints: {
          weekdays: [],
          subject_tokens: ["math"],
          username_tokens: [],
        },
      }),
      "write a poem"
    );
    expect(result.route).toBe("capabilities");
  });
});

describe("buildRouterMessages", () => {
  it("returns router system prompt and truncated user text", () => {
    const messages = buildRouterMessages("Arduino free Friday");
    expect(messages.system).toBe(SCHEDULE_ASSISTANT_ROUTER_SYSTEM_PROMPT);
    expect(messages.user).toBe("Arduino free Friday");
  });
});
