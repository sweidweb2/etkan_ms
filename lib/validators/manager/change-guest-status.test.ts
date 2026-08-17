import { describe, expect, it } from "vitest";
import {
  changeGuestStatusSchema,
  parseChangeGuestStatusFormData,
} from "@/lib/validators/manager/change-guest-status";

const guestId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

describe("changeGuestStatusSchema", () => {
  it("accepts a valid pipeline status with note", () => {
    const parsed = changeGuestStatusSchema.safeParse({
      id: guestId,
      status: "finished_meeting",
      note: "Met with parents",
    });
    expect(parsed.success).toBe(true);
  });

  it("trims empty note to null", () => {
    const parsed = changeGuestStatusSchema.safeParse({
      id: guestId,
      status: "started",
      note: "   ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.note).toBeNull();
    }
  });

  it("rejects profile statuses on the pipeline catalog", () => {
    const parsed = changeGuestStatusSchema.safeParse({
      id: guestId,
      status: "pending",
      note: null,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid guest id", () => {
    const parsed = changeGuestStatusSchema.safeParse({
      id: "bad",
      status: "started",
      note: null,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("parseChangeGuestStatusFormData", () => {
  it("parses FormData", () => {
    const formData = new FormData();
    formData.set("id", guestId);
    formData.set("status", "finished_meeting");
    formData.set("note", "Met");

    const parsed = parseChangeGuestStatusFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("finished_meeting");
      expect(parsed.data.note).toBe("Met");
    }
  });
});
