import { describe, expect, it } from "vitest";
import {
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
  parseCreateInstructorScheduleSlotFormData,
  resolveInstructorScheduleSlotType,
} from "@/lib/validators/manager/instructor-schedule-slot";

describe("resolveInstructorScheduleSlotType", () => {
  it("uses free for instructor slots without a workshop link", () => {
    expect(
      resolveInstructorScheduleSlotType({
        entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      })
    ).toBe("free");
  });

  it("uses busy for workshop entity slots", () => {
    expect(
      resolveInstructorScheduleSlotType({
        entityType: ENTITY_SCHEDULE_TYPE_WORKSHOP,
      })
    ).toBe("busy");
  });

  it("uses busy for instructor slots mirrored from a workshop", () => {
    expect(
      resolveInstructorScheduleSlotType({
        entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        sourceWorkshopId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      })
    ).toBe("busy");
  });
});

describe("parseCreateInstructorScheduleSlotFormData", () => {
  const instructorId = "11111111-1111-4111-8111-111111111111";
  const workshopId = "22222222-2222-4222-8222-222222222222";

  it("defaults instructor creates to free and fills slot_date when omitted", () => {
    const formData = new FormData();
    formData.set("entity_type", "instructor");
    formData.set("record_id", instructorId);
    formData.set("name", "Office hours");
    formData.set("start_time", "09:00");
    formData.set("end_time", "10:30");

    const result = parseCreateInstructorScheduleSlotFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("free");
      expect(result.data.slot_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("defaults workshop creates to busy", () => {
    const formData = new FormData();
    formData.set("entity_type", "workshop");
    formData.set("record_id", workshopId);
    formData.set("name", "Session block");
    formData.set("start_time", "09:00");
    formData.set("end_time", "11:00");
    formData.set("slot_date", "2026-09-01");

    const result = parseCreateInstructorScheduleSlotFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("busy");
      expect(result.data.slot_date).toBe("2026-09-01");
    }
  });
});
