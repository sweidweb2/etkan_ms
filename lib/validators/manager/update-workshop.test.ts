import { describe, expect, it } from "vitest";
import {
  parseUpdateWorkshopFormData,
  updateWorkshopSchema,
} from "@/lib/validators/manager/update-workshop";

const workshopId = "11111111-1111-4111-8111-111111111111";

const validInput = {
  id: workshopId,
  name: "Intro to UX",
  subject: "Design",
  target_audience: "Beginners",
  proposal_notes: null,
  delivery_place: null,
  nb_participants: 20,
  number_of_sessions: 4,
  price: 150,
  start_date: "2026-09-01",
  end_date: "2026-09-30",
};

describe("updateWorkshopSchema", () => {
  it("accepts a valid payload with id", () => {
    const parsed = updateWorkshopSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it("rejects missing id", () => {
    const { id: _id, ...rest } = validInput;
    const parsed = updateWorkshopSchema.safeParse(rest);
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid id", () => {
    const parsed = updateWorkshopSchema.safeParse({
      ...validInput,
      id: "not-a-uuid",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects end date before start date", () => {
    const parsed = updateWorkshopSchema.safeParse({
      ...validInput,
      end_date: "2026-08-01",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("parseUpdateWorkshopFormData", () => {
  it("parses FormData into typed input", () => {
    const formData = new FormData();
    formData.set("id", workshopId);
    formData.set("name", "Intro to UX");
    formData.set("price", "150");

    const parsed = parseUpdateWorkshopFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.id).toBe(workshopId);
      expect(parsed.data.price).toBe(150);
    }
  });

  it("returns field errors when id is invalid", () => {
    const formData = new FormData();
    formData.set("id", "bad");
    formData.set("name", "Intro to UX");

    const parsed = parseUpdateWorkshopFormData(formData);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.fieldErrors?.id?.[0]).toBeTruthy();
    }
  });
});
