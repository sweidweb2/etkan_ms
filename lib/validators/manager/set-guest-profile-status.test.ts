import { describe, expect, it } from "vitest";
import {
  parseSetGuestProfileStatusFormData,
  setGuestProfileStatusSchema,
} from "@/lib/validators/manager/set-guest-profile-status";

const guestId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

describe("setGuestProfileStatusSchema", () => {
  it("accepts the five profile statuses", () => {
    for (const status of [
      "scheduled",
      "pending",
      "cancelled",
      "rejected",
      "finished",
    ] as const) {
      const parsed = setGuestProfileStatusSchema.safeParse({
        id: guestId,
        status,
        note: null,
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("rejects pipeline-only statuses", () => {
    const parsed = setGuestProfileStatusSchema.safeParse({
      id: guestId,
      status: "finished_meeting",
      note: null,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("parseSetGuestProfileStatusFormData", () => {
  it("parses FormData", () => {
    const formData = new FormData();
    formData.set("id", guestId);
    formData.set("status", "cancelled");
    formData.set("note", "No-show");

    const parsed = parseSetGuestProfileStatusFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("cancelled");
      expect(parsed.data.note).toBe("No-show");
    }
  });
});
