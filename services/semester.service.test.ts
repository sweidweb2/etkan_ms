import { describe, expect, it, vi, beforeEach } from "vitest";
import { SEMESTER_STATUSES } from "@/lib/constants/manager-semester-status";
import * as semesterRepository from "@/repositories/semester.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  createSemesterForManager,
  getSemesterForManager,
  listSemestersForManager,
  updateSemesterForManager,
} from "@/services/semester.service";

vi.mock("@/repositories/semester.repository");
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));


vi.mock("@/services/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const semesterId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

const semesterRecord = {
  id: semesterId,
  name: "Fall 2026 Core Semester",
  nb_courses: 6,
  amount: 450,
  status: SEMESTER_STATUSES.SCHEDULED,
  start_date: "2026-09-01",
  semester_code: "4821",
  created_at: "2026-01-01T00:00:00.000Z",
};

const validCreateInput = {
  name: "Fall 2026 Core Semester",
  nb_courses: 6,
  amount: 450,
  status: SEMESTER_STATUSES.SCHEDULED,
  start_date: "2026-09-01",
};

describe("listSemestersForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listSemestersForManager(adminClient, null)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns mapped semesters", async () => {
    vi.mocked(semesterRepository.listSemesters).mockResolvedValue({
      data: [semesterRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const semesters = await listSemestersForManager(adminClient, actor.userId);

    expect(semesters).toEqual([
      {
        id: semesterId,
        name: "Fall 2026 Core Semester",
        nb_courses: 6,
        amount: 450,
        status: SEMESTER_STATUSES.SCHEDULED,
        start_date: "2026-09-01",
        semester_code: "4821",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("returns an empty list when no semesters exist", async () => {
    vi.mocked(semesterRepository.listSemesters).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const semesters = await listSemestersForManager(adminClient, actor.userId);

    expect(semesters).toEqual([]);
  });
});

describe("getSemesterForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      getSemesterForManager(adminClient, null, semesterId)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns null when semester is missing", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const semester = await getSemesterForManager(
      adminClient,
      actor.userId,
      semesterId
    );

    expect(semester).toBeNull();
  });

  it("returns semester when found", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: semesterRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const semester = await getSemesterForManager(
      adminClient,
      actor.userId,
      semesterId
    );

    expect(semester).toEqual({
      id: semesterId,
      name: "Fall 2026 Core Semester",
      nb_courses: 6,
      amount: 450,
      status: SEMESTER_STATUSES.SCHEDULED,
      start_date: "2026-09-01",
      semester_code: "4821",
      created_at: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("createSemesterForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized when actor is not a manager", async () => {
    const result = await createSemesterForManager(
      adminClient,
      null,
      actor,
      validCreateInput
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("returns validation errors for invalid input", async () => {
    const result = await createSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      {
        ...validCreateInput,
        name: "",
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("returns field error when semester name already exists", async () => {
    vi.mocked(semesterRepository.findSemesterByName).mockResolvedValue({
      data: { id: semesterId, name: "Fall 2026 Core Semester" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      validCreateInput
    );

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { name: ["A semester with this name already exists."] },
    });
  });

  it("creates a semester", async () => {
    vi.mocked(semesterRepository.findSemesterByName).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(semesterRepository.findSemesterByCode).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(semesterRepository.createSemester).mockResolvedValue({
      data: semesterRecord,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    });

    const result = await createSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      validCreateInput
    );

    expect(result).toEqual({
      success: true,
      semester: {
        id: semesterId,
        name: "Fall 2026 Core Semester",
        nb_courses: 6,
        amount: 450,
        status: SEMESTER_STATUSES.SCHEDULED,
        start_date: "2026-09-01",
        semester_code: "4821",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      message: "Semester created.",
    });

    expect(semesterRepository.createSemester).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        name: "Fall 2026 Core Semester",
        semester_code: expect.stringMatching(/^\d{4}$/),
      })
    );
  });
});

describe("updateSemesterForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("updates semester status and fields", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: semesterRecord,
      error: null,
    });
    vi.mocked(semesterRepository.findSemesterByName).mockResolvedValue({
      data: { id: semesterId, name: semesterRecord.name },
      error: null,
    });
    vi.mocked(semesterRepository.updateSemester).mockResolvedValue({
      data: {
        ...semesterRecord,
        amount: 500,
        status: SEMESTER_STATUSES.IN_PROGRESS,
        start_date: "2026-09-15",
      },
      error: null,
    });

    const result = await updateSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: semesterId,
        name: "Fall 2026 Core Semester",
        nb_courses: 6,
        amount: 500,
        status: SEMESTER_STATUSES.IN_PROGRESS,
        start_date: "2026-09-15",
      }
    );

    expect(result).toEqual({
      success: true,
      semester: {
        id: semesterId,
        name: "Fall 2026 Core Semester",
        nb_courses: 6,
        amount: 500,
        status: SEMESTER_STATUSES.IN_PROGRESS,
        start_date: "2026-09-15",
        semester_code: "4821",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      message: "Semester updated.",
    });
  });
});
