import { describe, expect, it } from "vitest";
import {
  createWorkshopSchema,
  parseCreateWorkshopFormData,
} from "@/lib/validators/manager/create-workshop";

const validInput = {
  name: "Intro to UX",
  subject: "Design",
  target_audience: "Beginners",
  proposal_notes: "Pilot cohort",
  delivery_place: "Main hall",
  nb_participants: 20,
  number_of_sessions: 4,
  price: 150,
  start_date: "2026-09-01",
  end_date: "2026-09-30",
};

describe("createWorkshopSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = createWorkshopSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it("accepts name-only with empty optionals", () => {
    const parsed = createWorkshopSchema.safeParse({
      name: "Minimal workshop",
      subject: "",
      target_audience: "",
      proposal_notes: "",
      delivery_place: "",
      nb_participants: "",
      number_of_sessions: "",
      price: "",
      start_date: "",
      end_date: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.subject).toBeNull();
      expect(parsed.data.nb_participants).toBeNull();
      expect(parsed.data.price).toBeNull();
      expect(parsed.data.start_date).toBeNull();
    }
  });

  it("rejects empty name", () => {
    const parsed = createWorkshopSchema.safeParse({
      ...validInput,
      name: "  ",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects end date before start date", () => {
    const parsed = createWorkshopSchema.safeParse({
      ...validInput,
      end_date: "2026-08-01",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects number_of_sessions below 1", () => {
    const parsed = createWorkshopSchema.safeParse({
      ...validInput,
      number_of_sessions: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects negative price", () => {
    const parsed = createWorkshopSchema.safeParse({
      ...validInput,
      price: -1,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("parseCreateWorkshopFormData", () => {
  it("parses FormData into typed input", () => {
    const formData = new FormData();
    formData.set("name", "Intro to UX");
    formData.set("subject", "Design");
    formData.set("nb_participants", "20");
    formData.set("number_of_sessions", "4");
    formData.set("price", "150");
    formData.set("start_date", "2026-09-01");
    formData.set("end_date", "2026-09-30");

    const parsed = parseCreateWorkshopFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Intro to UX");
      expect(parsed.data.nb_participants).toBe(20);
      expect(parsed.data.price).toBe(150);
    }
  });

  it("returns field errors for invalid FormData", () => {
    const formData = new FormData();
    formData.set("name", "");
    formData.set("price", "-5");

    const parsed = parseCreateWorkshopFormData(formData);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.fieldErrors?.name?.[0]).toBeTruthy();
    }
  });
});
