import { describe, expect, it } from "vitest";
import {
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
  getInstructorScheduleSlotDisplayColor,
} from "@/lib/validators/manager/instructor-schedule-slot";

const instructorA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const instructorB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const workshopA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const workshopB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const hexPattern = /^#[0-9A-F]{6}$/;

describe("getInstructorScheduleSlotDisplayColor", () => {
  it("returns a pastel hex color", () => {
    const color = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      recordId: instructorA,
    });
    expect(color).toMatch(hexPattern);
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

  it("keeps mirrored instructor slots stable per source workshop", () => {
    const first = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      recordId: instructorA,
      sourceWorkshopId: workshopA,
    });
    const second = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      recordId: instructorB,
      sourceWorkshopId: workshopA,
    });
    expect(first).toBe(second);
  });

  it("uses a different color for mirrored slots than the workshop entity", () => {
    const workshopColor = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_WORKSHOP,
      recordId: workshopA,
    });
    const mirrorColor = getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      recordId: instructorA,
      sourceWorkshopId: workshopA,
    });
    expect(mirrorColor).not.toBe(workshopColor);
  });

  it("uses distinct colors across instructors, workshops, and mirrors", () => {
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
      getInstructorScheduleSlotDisplayColor({
        entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        recordId: instructorA,
        sourceWorkshopId: workshopA,
      }),
      getInstructorScheduleSlotDisplayColor({
        entityType: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        recordId: instructorA,
        sourceWorkshopId: workshopB,
      }),
    ]);
    expect(colors.size).toBe(6);
  });
});
