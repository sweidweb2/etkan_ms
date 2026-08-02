import { describe, expect, it } from "vitest";
import {
  WORKSHOP_INSTRUCTOR_ROLES,
  WORKSHOP_WAGE_TYPES,
} from "@/lib/constants/manager-workshop-display";
import {
  createWorkshopInstructorSchema,
  parseCreateWorkshopInstructorFormData,
  updateWorkshopInstructorSchema,
} from "@/lib/validators/manager/workshop-instructor";

const workshopId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const assignmentId = "33333333-3333-4333-8333-333333333333";

const validCreate = {
  workshop_id: workshopId,
  user_id: userId,
  role: WORKSHOP_INSTRUCTOR_ROLES.LEAD,
  wage_type: WORKSHOP_WAGE_TYPES.FIXED,
  wage_amount: 500,
  notes: "Lead instructor",
};

describe("createWorkshopInstructorSchema", () => {
  it("accepts a valid payload", () => {
    expect(createWorkshopInstructorSchema.safeParse(validCreate).success).toBe(
      true
    );
  });

  it("rejects percentage above 100", () => {
    const parsed = createWorkshopInstructorSchema.safeParse({
      ...validCreate,
      wage_type: WORKSHOP_WAGE_TYPES.PERCENTAGE,
      wage_amount: 120,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts percentage at 100", () => {
    const parsed = createWorkshopInstructorSchema.safeParse({
      ...validCreate,
      wage_type: WORKSHOP_WAGE_TYPES.PERCENTAGE,
      wage_amount: 100,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts empty optional wage and notes", () => {
    const parsed = createWorkshopInstructorSchema.safeParse({
      ...validCreate,
      wage_amount: "",
      notes: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.wage_amount).toBeNull();
      expect(parsed.data.notes).toBeNull();
    }
  });
});

describe("updateWorkshopInstructorSchema", () => {
  it("requires assignment id", () => {
    expect(
      updateWorkshopInstructorSchema.safeParse({
        ...validCreate,
        id: assignmentId,
      }).success
    ).toBe(true);
    expect(
      updateWorkshopInstructorSchema.safeParse(validCreate).success
    ).toBe(false);
  });
});

describe("parseCreateWorkshopInstructorFormData", () => {
  it("parses FormData", () => {
    const formData = new FormData();
    formData.set("workshop_id", workshopId);
    formData.set("user_id", userId);
    formData.set("role", WORKSHOP_INSTRUCTOR_ROLES.ASSISTANT);
    formData.set("wage_type", WORKSHOP_WAGE_TYPES.PER_SESSION);
    formData.set("wage_amount", "50");
    formData.set("notes", "");

    const parsed = parseCreateWorkshopInstructorFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.role).toBe(WORKSHOP_INSTRUCTOR_ROLES.ASSISTANT);
      expect(parsed.data.wage_amount).toBe(50);
    }
  });
});
