import { describe, expect, it } from "vitest";
import {
  parseRecordGuestStatusesFormData,
  recordGuestStatusesSchema,
} from "@/lib/validators/manager/record-guest-statuses";

const guestId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

describe("recordGuestStatusesSchema", () => {
  it("accepts multiple pipeline statuses", () => {
    const parsed = recordGuestStatusesSchema.safeParse({
      id: guestId,
      statuses: ["started", "chose_plan", "finished"],
      note: "Catch up",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty selection", () => {
    const parsed = recordGuestStatusesSchema.safeParse({
      id: guestId,
      statuses: [],
      note: null,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects profile statuses", () => {
    const parsed = recordGuestStatusesSchema.safeParse({
      id: guestId,
      statuses: ["pending"],
      note: null,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("parseRecordGuestStatusesFormData", () => {
  it("parses repeated statuses fields", () => {
    const formData = new FormData();
    formData.set("id", guestId);
    formData.append("statuses", "started");
    formData.append("statuses", "finished");
    formData.set("note", "Bulk");

    const parsed = parseRecordGuestStatusesFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.statuses).toEqual(["started", "finished"]);
      expect(parsed.data.note).toBe("Bulk");
    }
  });
});
