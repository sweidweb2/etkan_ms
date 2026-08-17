import { describe, expect, it } from "vitest";
import {
  createGuestSchema,
  parseCreateGuestFormData,
} from "@/lib/validators/manager/create-guest";

const validInput = {
  full_name: "Ada Lovelace",
  phone: "+96171111111",
  age: 22,
  school_or_university: "AUB",
  education_level: "uni_year_3" as const,
  interested_service: "etkan_roadmap" as const,
  notes: "Walk-in",
};

describe("createGuestSchema", () => {
  it("accepts a valid guest intake payload", () => {
    const parsed = createGuestSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it("rejects age that is not positive", () => {
    const parsed = createGuestSchema.safeParse({ ...validInput, age: 0 });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid education level", () => {
    const parsed = createGuestSchema.safeParse({
      ...validInput,
      education_level: "phd",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid interested service", () => {
    const parsed = createGuestSchema.safeParse({
      ...validInput,
      interested_service: "internships",
    });
    expect(parsed.success).toBe(false);
  });

  it("allows empty school and notes as null", () => {
    const parsed = createGuestSchema.safeParse({
      ...validInput,
      school_or_university: "",
      notes: "   ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.school_or_university).toBeNull();
      expect(parsed.data.notes).toBeNull();
    }
  });
});

describe("parseCreateGuestFormData", () => {
  it("parses FormData successfully", () => {
    const formData = new FormData();
    formData.set("full_name", validInput.full_name);
    formData.set("phone", validInput.phone);
    formData.set("age", String(validInput.age));
    formData.set("school_or_university", validInput.school_or_university);
    formData.set("education_level", validInput.education_level);
    formData.set("interested_service", validInput.interested_service);
    formData.set("notes", validInput.notes);

    const parsed = parseCreateGuestFormData(formData);
    expect(parsed.success).toBe(true);
  });

  it("returns fieldErrors for missing name", () => {
    const formData = new FormData();
    formData.set("full_name", "");
    formData.set("phone", validInput.phone);
    formData.set("age", String(validInput.age));
    formData.set("education_level", validInput.education_level);
    formData.set("interested_service", validInput.interested_service);

    const parsed = parseCreateGuestFormData(formData);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.fieldErrors?.full_name?.[0]).toBeTruthy();
    }
  });
});
