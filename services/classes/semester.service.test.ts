import { describe, expect, it, vi, beforeEach } from "vitest";
import * as semesterRepository from "@/repositories/semester.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  createSemesterForManager,
  getSemesterForManager,
  listSemestersForManager,
  updateSemesterForManager,
} from "@/services/classes/semester.service";

vi.mock("@/repositories/semester.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/auth/authorization.service", () => ({
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
  semester_code: "4821",
  created_at: "2026-01-01T00:00:00.000Z",
};

const validCreateInput = {
  name: "Fall 2026 Core Semester",
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

  it("creates a semester with a manager-provided code", async () => {
    vi.mocked(semesterRepository.findSemesterByName).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(semesterRepository.findSemesterByCode).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(semesterRepository.createSemester).mockResolvedValue({
      data: { ...semesterRecord, semester_code: "1234" },
      error: null,
    } as never);

    const result = await createSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      { ...validCreateInput, semester_code: "1234" }
    );

    expect(result.success).toBe(true);
    expect(semesterRepository.findSemesterByCode).toHaveBeenCalledTimes(1);
    expect(semesterRepository.findSemesterByCode).toHaveBeenCalledWith(
      adminClient,
      "1234"
    );
    expect(semesterRepository.createSemester).toHaveBeenCalledWith(
      adminClient,
      { name: "Fall 2026 Core Semester", semester_code: "1234" }
    );
  });

  it("rejects a code that is not 4 digits", async () => {
    const result = await createSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      { ...validCreateInput, semester_code: "12a" }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.semester_code).toBeDefined();
    }
    expect(semesterRepository.createSemester).not.toHaveBeenCalled();
  });

  it("rejects a code that is already in use", async () => {
    vi.mocked(semesterRepository.findSemesterByName).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(semesterRepository.findSemesterByCode).mockResolvedValue({
      data: { id: "other-semester", semester_code: "4821" },
      error: null,
    } as never);

    const result = await createSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      { ...validCreateInput, semester_code: "4821" }
    );

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { semester_code: ["This semester code is already in use."] },
    });
    expect(semesterRepository.createSemester).not.toHaveBeenCalled();
  });

  it("maps a unique-violation race on the code to a field error", async () => {
    vi.mocked(semesterRepository.findSemesterByName).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(semesterRepository.findSemesterByCode).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(semesterRepository.createSemester).mockResolvedValue({
      data: null,
      error: {
        message:
          'duplicate key value violates unique constraint "semesters_semester_code_unique"',
      },
    } as never);

    const result = await createSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      { ...validCreateInput, semester_code: "4821" }
    );

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { semester_code: ["This semester code is already in use."] },
    });
  });
});

describe("updateSemesterForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("updates semester name", async () => {
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
        name: "Fall 2026 Renamed",
      },
      error: null,
    });

    const result = await updateSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: semesterId,
        name: "Fall 2026 Renamed",
        semester_code: "4821",
      }
    );

    expect(result).toEqual({
      success: true,
      semester: {
        id: semesterId,
        name: "Fall 2026 Renamed",
        semester_code: "4821",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      message: "Semester updated.",
    });
    expect(semesterRepository.findSemesterByCode).not.toHaveBeenCalled();
  });

  it("updates semester code when it is free", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: semesterRecord,
      error: null,
    } as never);
    vi.mocked(semesterRepository.findSemesterByCode).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(semesterRepository.updateSemester).mockResolvedValue({
      data: { ...semesterRecord, semester_code: "0007" },
      error: null,
    } as never);

    const result = await updateSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      { id: semesterId, name: semesterRecord.name, semester_code: "0007" }
    );

    expect(result.success).toBe(true);
    expect(semesterRepository.findSemesterByName).not.toHaveBeenCalled();
    expect(semesterRepository.updateSemester).toHaveBeenCalledWith(
      adminClient,
      semesterId,
      { name: semesterRecord.name, semester_code: "0007" }
    );
  });

  it("rejects a code used by another semester", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: semesterRecord,
      error: null,
    } as never);
    vi.mocked(semesterRepository.findSemesterByCode).mockResolvedValue({
      data: { id: "other-semester", semester_code: "1111" },
      error: null,
    } as never);

    const result = await updateSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      { id: semesterId, name: semesterRecord.name, semester_code: "1111" }
    );

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { semester_code: ["This semester code is already in use."] },
    });
    expect(semesterRepository.updateSemester).not.toHaveBeenCalled();
  });
});
