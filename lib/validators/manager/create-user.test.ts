import { describe, expect, it } from "vitest";
import { DEFAULT_CREATED_STUDENT_PASSWORD } from "@/lib/constants/auth-limits";
import { ROLES } from "@/lib/constants/roles";
import {
  createStaffUserSchema,
  parseCreateStaffUserFormData,
  resolveCreateStaffUserInput,
} from "@/lib/validators/manager/create-user";

const validInput = {
  username: "teacher1",
  email: "teacher@school.com",
  password: "",
  role: ROLES.TEACHER,
  is_instructor: false,
  is_mentor: false,
};

describe("createStaffUserSchema", () => {
  it("accepts an empty password", () => {
    const parsed = createStaffUserSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it("rejects a too-short explicit password", () => {
    const parsed = createStaffUserSchema.safeParse({
      ...validInput,
      password: "ab",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts supervisor as a creatable staff role", () => {
    const parsed = createStaffUserSchema.safeParse({
      ...validInput,
      username: "supervisor1",
      email: "supervisor@school.com",
      role: ROLES.SUPERVISOR,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts CRM as a creatable staff role", () => {
    const parsed = createStaffUserSchema.safeParse({
      ...validInput,
      username: "crm1",
      email: "crm@school.com",
      role: ROLES.CRM,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("resolveCreateStaffUserInput", () => {
  it("defaults a blank password to the literal password string", () => {
    const parsed = createStaffUserSchema.parse(validInput);
    const resolved = resolveCreateStaffUserInput(parsed);
    expect(resolved.password).toBe(DEFAULT_CREATED_STUDENT_PASSWORD);
  });

  it("keeps an explicit password", () => {
    const parsed = createStaffUserSchema.parse({
      ...validInput,
      password: "secret1",
    });
    const resolved = resolveCreateStaffUserInput(parsed);
    expect(resolved.password).toBe("secret1");
  });
});

describe("parseCreateStaffUserFormData", () => {
  it("parses the form and defaults an empty password", () => {
    const formData = new FormData();
    formData.set("username", "teacher1");
    formData.set("email", "teacher@school.com");
    formData.set("password", "");
    formData.set("role", ROLES.TEACHER);
    formData.set("is_instructor", "false");
    formData.set("is_mentor", "false");

    const parsed = parseCreateStaffUserFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.password).toBe(DEFAULT_CREATED_STUDENT_PASSWORD);
    }
  });
});
