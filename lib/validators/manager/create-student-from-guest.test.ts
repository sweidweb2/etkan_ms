import { describe, expect, it } from "vitest";
import { DEFAULT_CREATED_STUDENT_PASSWORD } from "@/lib/constants/auth-limits";
import {
  createStudentFromGuestSchema,
  parseCreateStudentFromGuestFormData,
  resolveCreateStudentFromGuestInput,
} from "@/lib/validators/manager/create-student-from-guest";

const guestId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

const validInput = {
  guest_id: guestId,
  username: "ada_lovelace",
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  password: "",
  confirmPassword: "",
  birthDate: "2001-12-10",
  phone: "+96171111111",
  markGuestAsFinished: true,
};

describe("createStudentFromGuestSchema", () => {
  it("accepts empty passwords", () => {
    const parsed = createStudentFromGuestSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it("rejects when only one password field is filled", () => {
    const parsed = createStudentFromGuestSchema.safeParse({
      ...validInput,
      password: "secret1",
      confirmPassword: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const parsed = createStudentFromGuestSchema.safeParse({
      ...validInput,
      password: "secret1",
      confirmPassword: "secret2",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts matching explicit passwords", () => {
    const parsed = createStudentFromGuestSchema.safeParse({
      ...validInput,
      password: "secret1",
      confirmPassword: "secret1",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("resolveCreateStudentFromGuestInput", () => {
  it("defaults blank passwords to the literal password string", () => {
    const parsed = createStudentFromGuestSchema.parse(validInput);
    const resolved = resolveCreateStudentFromGuestInput(parsed);
    expect(resolved.password).toBe(DEFAULT_CREATED_STUDENT_PASSWORD);
    expect(resolved.confirmPassword).toBe(DEFAULT_CREATED_STUDENT_PASSWORD);
  });

  it("keeps an explicit matching password", () => {
    const parsed = createStudentFromGuestSchema.parse({
      ...validInput,
      password: "secret1",
      confirmPassword: "secret1",
    });
    const resolved = resolveCreateStudentFromGuestInput(parsed);
    expect(resolved.password).toBe("secret1");
    expect(resolved.confirmPassword).toBe("secret1");
  });
});

describe("parseCreateStudentFromGuestFormData", () => {
  it("parses the form and defaults empty passwords", () => {
    const formData = new FormData();
    formData.set("guest_id", guestId);
    formData.set("username", "ada_lovelace");
    formData.set("fullName", "Ada Lovelace");
    formData.set("email", "ada@example.com");
    formData.set("password", "");
    formData.set("confirmPassword", "");
    formData.set("birthDate", "2001-12-10");
    formData.set("phone", "+96171111111");
    formData.set("markGuestAsFinished", "true");

    const parsed = parseCreateStudentFromGuestFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.password).toBe(DEFAULT_CREATED_STUDENT_PASSWORD);
      expect(parsed.data.markGuestAsFinished).toBe(true);
    }
  });

  it("treats markGuestAsFinished false as off", () => {
    const formData = new FormData();
    formData.set("guest_id", guestId);
    formData.set("username", "ada_lovelace");
    formData.set("fullName", "Ada Lovelace");
    formData.set("email", "ada@example.com");
    formData.set("password", "");
    formData.set("confirmPassword", "");
    formData.set("birthDate", "2001-12-10");
    formData.set("phone", "+96171111111");
    formData.set("markGuestAsFinished", "false");

    const parsed = parseCreateStudentFromGuestFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.markGuestAsFinished).toBe(false);
    }
  });
});
