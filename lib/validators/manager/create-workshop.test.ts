import { describe, expect, it } from "vitest";
import { WORKSHOP_OFFERING_TYPES } from "@/lib/constants/manager-workshop-display";
import {
  createWorkshopSchema,
  parseCreateWorkshopFormData,
} from "@/lib/validators/manager/create-workshop";

const validInput = {
  name: "Intro to UX",
  type: WORKSHOP_OFFERING_TYPES.WORKSHOP,
  phone: "+961 71 234 567",
  subject: "Design",
  target_audience: "Beginners",
  proposal_notes: "Pilot cohort",
  delivery_place: "Main hall",
  nb_participants: 20,
  price: 150,
  start_date: "2026-09-01",
  end_date: "2026-09-30",
};

describe("createWorkshopSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = createWorkshopSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it("accepts name+type with empty optionals", () => {
    const parsed = createWorkshopSchema.safeParse({
      name: "Minimal workshop",
      type: WORKSHOP_OFFERING_TYPES.COURSE,
      phone: "",
      subject: "",
      target_audience: "",
      proposal_notes: "",
      delivery_place: "",
      nb_participants: "",
      price: "",
      start_date: "",
      end_date: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe("course");
      expect(parsed.data.phone).toBeNull();
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

  it("rejects invalid type", () => {
    const parsed = createWorkshopSchema.safeParse({
      ...validInput,
      type: "meeting",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects the retired online type", () => {
    const parsed = createWorkshopSchema.safeParse({
      ...validInput,
      type: "online",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts private type", () => {
    const parsed = createWorkshopSchema.safeParse({
      ...validInput,
      type: WORKSHOP_OFFERING_TYPES.PRIVATE,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects phone over max length", () => {
    const parsed = createWorkshopSchema.safeParse({
      ...validInput,
      phone: "1".repeat(21),
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
    formData.set("type", "private");
    formData.set("phone", "+961 71 234 567");
    formData.set("subject", "Design");
    formData.set("nb_participants", "20");
    formData.set("price", "150");
    formData.set("start_date", "2026-09-01");
    formData.set("end_date", "2026-09-30");

    const parsed = parseCreateWorkshopFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Intro to UX");
      expect(parsed.data.type).toBe("private");
      expect(parsed.data.phone).toBe("+961 71 234 567");
      expect(parsed.data.nb_participants).toBe(20);
      expect(parsed.data.price).toBe(150);
    }
  });

  it("returns field errors for invalid FormData", () => {
    const formData = new FormData();
    formData.set("name", "");
    formData.set("type", "workshop");
    formData.set("price", "-5");

    const parsed = parseCreateWorkshopFormData(formData);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.fieldErrors?.name?.[0]).toBeTruthy();
    }
  });
});
