import { describe, expect, it } from "vitest";
import {
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
  getInstructorScheduleSlotDisplayColor,
  INSTRUCTOR_SCHEDULE_SLOT_COLORS,
} from "@/lib/validators/manager/instructor-schedule-slot";

const instructorA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const instructorB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const workshopA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const workshopB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("getInstructorScheduleSlotDisplayColor", () => {
  it("returns a pastel preset from the palette", () => {
    const color = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      recordId: instructorA,
    });
    expect(INSTRUCTOR_SCHEDULE_SLOT_COLORS).toContain(color);
  });

  it("keeps the same color for all slots of one instructor", () => {
    const first = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      recordId: instructorA,
    });
    const second = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      recordId: instructorA,
    });
    expect(first).toBe(second);
  });

  it("keeps the same color for all slots of one workshop", () => {
    const first = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_WORKSHOP,
      recordId: workshopA,
    });
    const second = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_WORKSHOP,
      recordId: workshopA,
    });
    expect(first).toBe(second);
  });

  it("matches mirrored instructor slots to their workshop color", () => {
    const workshopColor = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_WORKSHOP,
      recordId: workshopA,
    });
    const mirrorColor = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      recordId: instructorA,
      sourceWorkshopId: workshopA,
    });
    expect(mirrorColor).toBe(workshopColor);
  });

  it("can differ across instructors and workshops", () => {
    const colors = new Set([
      getInstructorScheduleSlotDisplayColor({
        entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        recordId: instructorA,
      }),
      getInstructorScheduleSlotDisplayColor({
        entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        recordId: instructorB,
      }),
      getInstructorScheduleSlotDisplayColor({
        entityType: ENTITY_SCHEDULE_TYPE_WORKSHOP,
        recordId: workshopA,
      }),
      getInstructorScheduleSlotDisplayColor({
        entityType: ENTITY_SCHEDULE_TYPE_WORKSHOP,
        recordId: workshopB,
      }),
    ]);
    expect(colors.size).toBeGreaterThan(1);
  });
});
