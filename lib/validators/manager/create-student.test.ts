import { describe, expect, it } from "vitest";
import { DEFAULT_CREATED_STUDENT_PASSWORD } from "@/lib/constants/auth-limits";
import {
  createStudentSchema,
  parseCreateStudentFormData,
  resolveCreateStudentInput,
} from "@/lib/validators/manager/create-student";

const validInput = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  password: "",
  confirmPassword: "",
  birthDate: "2001-12-10",
  phone: "+96171111111",
};

describe("createStudentSchema", () => {
  it("accepts empty passwords", () => {
    const parsed = createStudentSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it("rejects when only one password field is filled", () => {
    const parsed = createStudentSchema.safeParse({
      ...validInput,
      password: "secret1",
      confirmPassword: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const parsed = createStudentSchema.safeParse({
      ...validInput,
      password: "secret1",
      confirmPassword: "secret2",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a too-short explicit password", () => {
    const parsed = createStudentSchema.safeParse({
      ...validInput,
      password: "ab",
      confirmPassword: "ab",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts matching explicit passwords", () => {
    const parsed = createStudentSchema.safeParse({
      ...validInput,
      password: "secret1",
      confirmPassword: "secret1",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("resolveCreateStudentInput", () => {
  it("defaults blank passwords to the literal password string", () => {
    const parsed = createStudentSchema.parse(validInput);
    const resolved = resolveCreateStudentInput(parsed);
    expect(resolved.password).toBe(DEFAULT_CREATED_STUDENT_PASSWORD);
    expect(resolved.confirmPassword).toBe(DEFAULT_CREATED_STUDENT_PASSWORD);
  });

  it("keeps an explicit matching password", () => {
    const parsed = createStudentSchema.parse({
      ...validInput,
      password: "secret1",
      confirmPassword: "secret1",
    });
    const resolved = resolveCreateStudentInput(parsed);
    expect(resolved.password).toBe("secret1");
    expect(resolved.confirmPassword).toBe("secret1");
  });
});

describe("parseCreateStudentFormData", () => {
  it("parses the form and defaults empty passwords", () => {
    const formData = new FormData();
    formData.set("fullName", "Ada Lovelace");
    formData.set("email", "ada@example.com");
    formData.set("password", "");
    formData.set("confirmPassword", "");
    formData.set("birthDate", "2001-12-10");
    formData.set("phone", "+96171111111");

    const parsed = parseCreateStudentFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.password).toBe(DEFAULT_CREATED_STUDENT_PASSWORD);
    }
  });
});
