import { describe, expect, it, vi, beforeEach } from "vitest";
import { SCHEDULE_ASSISTANT_TOOL_NAMES } from "@/lib/constants/schedule-assistant";
import * as instructorSubjectCapabilityRepository from "@/repositories/instructor-subject-capability.repository";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import * as authorizationService from "@/services/authorization.service";
import {
  executeScheduleAssistantTool,
  listFreeSlotsForInstructors,
  searchInstructorsBySubject,
} from "@/services/schedule-assistant.service";

vi.mock("@/repositories/instructor-subject-capability.repository");
vi.mock("@/repositories/instructor-schedule-slot.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/subject.repository");
vi.mock("@/services/authorization.service", () => ({
  assertPermission: vi.fn().mockResolvedValue(undefined),
}));

const adminClient = {} as never;
const instructorId = "11111111-1111-4111-8111-111111111111";
const otherInstructorId = "22222222-2222-4222-8222-222222222222";
const subjectId = "33333333-3333-4333-8333-333333333333";

describe("searchInstructorsBySubject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns instructors with matching subject capabilities", async () => {
    vi.mocked(subjectRepository.listSubjects).mockResolvedValue({
      data: [
        {
          id: subjectId,
          name: "Arduino Basics",
          syllabus_link: null,
          reference_link: null,
          handout_link: null,
          nb_sessions: 1,
          created_at: null,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      instructorSubjectCapabilityRepository.listAllInstructorSubjectCapabilities
    ).mockResolvedValue({
      data: [
        {
          id: "c1",
          user_id: instructorId,
          subject_id: subjectId,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(profileRepository.listInstructorProfiles).mockResolvedValue({
      data: [
        {
          id: instructorId,
          username: "alice",
          role: "manager",
          is_instructor: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await searchInstructorsBySubject(adminClient, {
      query: "arduino",
    });

    expect(result.instructors).toEqual([
      {
        id: instructorId,
        username: "alice",
        subjects: ["Arduino Basics"],
      },
    ]);
  });
});

describe("listFreeSlotsForInstructors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters free slots by weekday and instructor", async () => {
    vi.mocked(
      instructorScheduleSlotRepository.listInstructorScheduleSlotsByEntity
    ).mockResolvedValue({
      data: [
        {
          id: "s1",
          entity_type: "instructor",
          record_id: instructorId,
          name: "Morning",
          type: "free",
          slot_date: "2026-08-07",
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
          slot_date: "2026-08-07",
          start_time: "12:00:00",
          end_time: "13:00:00",
          color: "#ef4444",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "s3",
          entity_type: "instructor",
          record_id: otherInstructorId,
          name: "Other",
          type: "free",
          slot_date: "2026-08-07",
          start_time: "10:00:00",
          end_time: "12:00:00",
          color: "#22c55e",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(profileRepository.listInstructorProfiles).mockResolvedValue({
      data: [
        {
          id: instructorId,
          username: "alice",
          role: "manager",
          is_instructor: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: otherInstructorId,
          username: "bob",
          role: "manager",
          is_instructor: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await listFreeSlotsForInstructors(adminClient, {
      instructor_ids: [instructorId],
      weekdays: ["friday"],
    });

    expect(result.slots).toHaveLength(1);
    expect(result.slots[0]).toMatchObject({
      instructor_id: instructorId,
      weekday: "friday",
      start_time: "09:00",
      end_time: "11:00",
    });
  });
});

describe("executeScheduleAssistantTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authorizationService.assertPermission).mockResolvedValue(
      undefined as never
    );
  });

  it("rejects unknown tools", async () => {
    await expect(
      executeScheduleAssistantTool(adminClient, instructorId, "hack", {})
    ).rejects.toThrow(/unknown tool/i);
  });

  it("runs search tool name from whitelist", async () => {
    vi.mocked(subjectRepository.listSubjects).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      instructorSubjectCapabilityRepository.listAllInstructorSubjectCapabilities
    ).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(profileRepository.listInstructorProfiles).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await executeScheduleAssistantTool(
      adminClient,
      instructorId,
      SCHEDULE_ASSISTANT_TOOL_NAMES.SEARCH_INSTRUCTORS_BY_SUBJECT,
      { query: "math" }
    );

    expect(result.summary).toMatch(/0 instructor/i);
  });
});
