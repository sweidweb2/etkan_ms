import { describe, expect, it } from "vitest";
import { scheduleAssistantPromptSchema } from "@/lib/validators/manager/schedule-assistant";
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
