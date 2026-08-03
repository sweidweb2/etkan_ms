import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SCHEDULE_ASSISTANT_MAX_INSTRUCTORS,
  SCHEDULE_ASSISTANT_MAX_SLOTS,
} from "@/lib/constants/schedule-assistant";
import {
  getSundayWeekBounds,
  projectInstructorSlotDate,
} from "@/lib/manager/instructor-schedule-calendar";
import * as instructorSubjectCapabilityRepository from "@/repositories/instructor-subject-capability.repository";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import * as authorizationService from "@/services/authorization.service";
import {
  listCapabilityMatrixCatalog,
  listInstructorsCatalog,
  listSlotsThisWeekCatalog,
  listSubjectsCatalog,
} from "@/services/schedule-assistant.service";

vi.mock("@/repositories/instructor-subject-capability.repository");
vi.mock("@/repositories/instructor-schedule-slot.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/subject.repository");
vi.mock("@/services/authorization.service", () => ({
  assertPermission: vi.fn().mockResolvedValue(undefined),
}));

const adminClient = {} as never;
const actorId = "11111111-1111-4111-8111-111111111111";
const instructorId = "22222222-2222-4222-8222-222222222222";
const subjectId = "33333333-3333-4333-8333-333333333333";

function emptyListResult<T>(data: T[] = []) {
  return {
    data,
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  };
}

describe("schedule-assistant catalog loaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authorizationService.assertPermission).mockResolvedValue(
      undefined as never
    );
  });

  it("returns empty instructors catalog", async () => {
    vi.mocked(profileRepository.listInstructorProfiles).mockResolvedValue(
      emptyListResult()
    );

    const result = await listInstructorsCatalog(adminClient, actorId);
    expect(result).toEqual({
      instructors: [],
      truncated: false,
      total: 0,
    });
  });

  it("truncates instructors beyond max", async () => {
    const data = Array.from(
      { length: SCHEDULE_ASSISTANT_MAX_INSTRUCTORS + 5 },
      (_, index) => ({
        id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        username: `user${String(index).padStart(2, "0")}`,
        role: "manager" as const,
        is_instructor: true,
        created_at: "2026-01-01T00:00:00.000Z",
      })
    );
    vi.mocked(profileRepository.listInstructorProfiles).mockResolvedValue(
      emptyListResult(data)
    );

    const result = await listInstructorsCatalog(adminClient, actorId);
    expect(result.instructors).toHaveLength(SCHEDULE_ASSISTANT_MAX_INSTRUCTORS);
    expect(result.truncated).toBe(true);
    expect(result.total).toBe(SCHEDULE_ASSISTANT_MAX_INSTRUCTORS + 5);
    expect(result.instructors[0]).toMatchObject({
      i: data[0]!.id,
      u: "user00",
    });
  });

  it("returns empty subjects catalog", async () => {
    vi.mocked(subjectRepository.listSubjects).mockResolvedValue(
      emptyListResult()
    );

    await expect(listSubjectsCatalog(adminClient, actorId)).resolves.toEqual({
      subjects: [],
      truncated: false,
      total: 0,
    });
  });

  it("builds capability matrix for instructors", async () => {
    vi.mocked(subjectRepository.listSubjects).mockResolvedValue(
      emptyListResult([
        {
          id: subjectId,
          name: "Arduino Basics",
          syllabus_link: null,
          reference_link: null,
          handout_link: null,
          nb_sessions: 1,
          created_at: null,
        },
      ])
    );
    vi.mocked(
      instructorSubjectCapabilityRepository.listAllInstructorSubjectCapabilities
    ).mockResolvedValue(
      emptyListResult([
        {
          id: "c1",
          user_id: instructorId,
          subject_id: subjectId,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ])
    );
    vi.mocked(profileRepository.listInstructorProfiles).mockResolvedValue(
      emptyListResult([
        {
          id: instructorId,
          username: "alice",
          role: "manager",
          is_instructor: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ])
    );

    const result = await listCapabilityMatrixCatalog(adminClient, actorId);
    expect(result.matrix).toEqual([{ u: "alice", sub: ["Arduino Basics"] }]);
    expect(result.truncated).toBe(false);
    expect(result.total).toBe(1);
  });

  it("projects free slots onto this week Friday and skips busy", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { weekStart } = getSundayWeekBounds(today);
    const expectedFriday = projectInstructorSlotDate(weekStart, 5);

    vi.mocked(
      instructorScheduleSlotRepository.listInstructorScheduleSlotsByEntity
    ).mockResolvedValue(
      emptyListResult([
        {
          id: "s1",
          entity_type: "instructor",
          record_id: instructorId,
          name: "Morning",
          type: "free",
          slot_date: "1970-01-01",
          day_of_week: 5,
          start_time: "09:00:00",
          end_time: "11:00:00",
          color: "#22c55e",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "s2",
          entity_type: "instructor",
          record_id: instructorId,
          name: "Busy",
          type: "busy",
          slot_date: "1970-01-01",
          day_of_week: 5,
          start_time: "12:00:00",
          end_time: "13:00:00",
          color: "#ef4444",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ])
    );
    vi.mocked(profileRepository.listInstructorProfiles).mockResolvedValue(
      emptyListResult([
        {
          id: instructorId,
          username: "alice",
          role: "manager",
          is_instructor: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ])
    );

    const result = await listSlotsThisWeekCatalog(adminClient, actorId);
    expect(result.slots).toHaveLength(1);
    expect(result.slots[0]).toEqual({
      i: instructorId,
      u: "alice",
      d: expectedFriday,
      w: "friday",
      s: "09:00",
      e: "11:00",
    });
  });

  it("truncates slots beyond max", async () => {
    const slotRows = Array.from(
      { length: SCHEDULE_ASSISTANT_MAX_SLOTS + 3 },
      (_, index) => ({
        id: `s${index}`,
        entity_type: "instructor" as const,
        record_id: instructorId,
        name: `Slot ${index}`,
        type: "free" as const,
        slot_date: "1970-01-01",
        day_of_week: index % 7,
        start_time: `${String(8 + (index % 8)).padStart(2, "0")}:00:00`,
        end_time: `${String(9 + (index % 8)).padStart(2, "0")}:00:00`,
        color: "#22c55e",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      })
    );

    vi.mocked(
      instructorScheduleSlotRepository.listInstructorScheduleSlotsByEntity
    ).mockResolvedValue(emptyListResult(slotRows));
    vi.mocked(profileRepository.listInstructorProfiles).mockResolvedValue(
      emptyListResult([
        {
          id: instructorId,
          username: "alice",
          role: "manager",
          is_instructor: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ])
    );

    const result = await listSlotsThisWeekCatalog(adminClient, actorId);
    expect(result.slots).toHaveLength(SCHEDULE_ASSISTANT_MAX_SLOTS);
    expect(result.truncated).toBe(true);
    expect(result.total).toBe(SCHEDULE_ASSISTANT_MAX_SLOTS + 3);
  });

  it("returns empty slots when none free", async () => {
    vi.mocked(
      instructorScheduleSlotRepository.listInstructorScheduleSlotsByEntity
    ).mockResolvedValue(emptyListResult());
    vi.mocked(profileRepository.listInstructorProfiles).mockResolvedValue(
      emptyListResult()
    );

    await expect(
      listSlotsThisWeekCatalog(adminClient, actorId)
    ).resolves.toEqual({
      slots: [],
      truncated: false,
      total: 0,
    });
  });
});
