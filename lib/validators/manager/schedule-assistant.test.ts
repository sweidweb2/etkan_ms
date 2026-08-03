import { describe, expect, it } from "vitest";
import {
  scheduleAssistantGroupsResultSchema,
  scheduleAssistantInstructorsCatalogSchema,
  scheduleAssistantMatrixCatalogSchema,
  scheduleAssistantPromptSchema,
  scheduleAssistantRouterResultSchema,
  scheduleAssistantSlotsCatalogSchema,
  scheduleAssistantSubjectsCatalogSchema,
} from "@/lib/validators/manager/schedule-assistant";
import { SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH } from "@/lib/constants/schedule-assistant";

describe("scheduleAssistantPromptSchema", () => {
  it("accepts a normal prompt", () => {
    const parsed = scheduleAssistantPromptSchema.safeParse({
      prompt: "Arduino free Tuesday",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty and oversized prompts", () => {
    expect(
      scheduleAssistantPromptSchema.safeParse({ prompt: "   " }).success
    ).toBe(false);
    expect(
      scheduleAssistantPromptSchema.safeParse({
        prompt: "x".repeat(SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH + 1),
      }).success
    ).toBe(false);
  });
});

describe("scheduleAssistantRouterResultSchema", () => {
  it("parses route + hints", () => {
    const parsed = scheduleAssistantRouterResultSchema.safeParse({
      route: "capability_availability",
      hints: {
        weekdays: ["friday"],
        subject_tokens: ["arduino"],
        username_tokens: [],
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.route).toBe("capability_availability");
      expect(parsed.data.hints.weekdays).toEqual(["friday"]);
    }
  });

  it("defaults empty hints", () => {
    const parsed = scheduleAssistantRouterResultSchema.safeParse({
      route: "refuse",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.hints).toEqual({
        weekdays: [],
        subject_tokens: [],
        username_tokens: [],
      });
    }
  });
});

describe("scheduleAssistantGroupsResultSchema", () => {
  it("accepts capability and join directions", () => {
    const parsed = scheduleAssistantGroupsResultSchema.safeParse({
      groups: [
        {
          id: "g1",
          direction: "capability_to_username",
          usernames: [],
          subject_names: ["Arduino Basics"],
          weekdays: [],
        },
        {
          direction: "subject_and_availability",
          subject_names: ["Arduino Basics"],
          weekdays: ["friday"],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty groups", () => {
    expect(
      scheduleAssistantGroupsResultSchema.safeParse({ groups: [] }).success
    ).toBe(false);
  });

  it("rejects unknown directions", () => {
    expect(
      scheduleAssistantGroupsResultSchema.safeParse({
        groups: [{ direction: "invented_direction" }],
      }).success
    ).toBe(false);
  });
});

describe("compact catalog schemas", () => {
  it("accepts instructors / subjects / matrix / slots shapes", () => {
    expect(
      scheduleAssistantInstructorsCatalogSchema.safeParse({
        instructors: [{ i: "1", u: "ali" }],
        truncated: false,
        total: 1,
      }).success
    ).toBe(true);

    expect(
      scheduleAssistantSubjectsCatalogSchema.safeParse({
        subjects: ["Arduino Basics"],
        truncated: false,
        total: 1,
      }).success
    ).toBe(true);

    expect(
      scheduleAssistantMatrixCatalogSchema.safeParse({
        matrix: [{ u: "ali", sub: ["Arduino Basics"] }],
        truncated: false,
        total: 1,
      }).success
    ).toBe(true);

    expect(
      scheduleAssistantSlotsCatalogSchema.safeParse({
        slots: [
          {
            i: "1",
            u: "ali",
            d: "2026-08-07",
            w: "friday",
            s: "09:00",
            e: "11:00",
          },
        ],
        truncated: false,
        total: 1,
      }).success
    ).toBe(true);
  });
});
