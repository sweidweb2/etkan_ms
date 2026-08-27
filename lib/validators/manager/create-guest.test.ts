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

  it("accepts full_name only", () => {
    const parsed = createGuestSchema.safeParse({ full_name: "Ada Lovelace" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.phone).toBeNull();
      expect(parsed.data.age).toBeNull();
      expect(parsed.data.education_level).toBeNull();
      expect(parsed.data.interested_service).toBeNull();
      expect(parsed.data.status).toBe("scheduled");
    }
  });

  it("rejects age that is not positive when provided", () => {
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

  it("allows empty optional fields as null", () => {
    const parsed = createGuestSchema.safeParse({
      full_name: "Ada Lovelace",
      phone: "",
      age: "",
      school_or_university: "",
      education_level: "",
      interested_service: "",
      notes: "   ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.phone).toBeNull();
      expect(parsed.data.age).toBeNull();
      expect(parsed.data.school_or_university).toBeNull();
      expect(parsed.data.education_level).toBeNull();
      expect(parsed.data.interested_service).toBeNull();
      expect(parsed.data.notes).toBeNull();
    }
  });

  it("defaults status to scheduled", () => {
    const parsed = createGuestSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("scheduled");
    }
  });

  it("rejects profile statuses other than scheduled or pending", () => {
    const parsed = createGuestSchema.safeParse({
      ...validInput,
      status: "finished",
    });
    expect(parsed.success).toBe(false);
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
    if (parsed.success) {
      expect(parsed.data.status).toBe("scheduled");
    }
  });

  it("parses name-only FormData", () => {
    const formData = new FormData();
    formData.set("full_name", validInput.full_name);

    const parsed = parseCreateGuestFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.full_name).toBe("Ada Lovelace");
      expect(parsed.data.phone).toBeNull();
      expect(parsed.data.age).toBeNull();
    }
  });

  it("parses pending status from FormData", () => {
    const formData = new FormData();
    formData.set("full_name", validInput.full_name);
    formData.set("status", "pending");

    const parsed = parseCreateGuestFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("pending");
    }
  });

  it("returns fieldErrors for missing name", () => {
    const formData = new FormData();
    formData.set("full_name", "");

    const parsed = parseCreateGuestFormData(formData);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.fieldErrors?.full_name?.[0]).toBeTruthy();
    }
  });
});
