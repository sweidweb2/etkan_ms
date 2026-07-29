import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import * as classRepository from "@/repositories/class.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  createSubjectForManager,
  deleteSubjectForManager,
  getSubjectForManager,
  listSubjectClassesForManager,
  listSubjectsForManager,
} from "@/services/subject.service";

vi.mock("@/repositories/subject.repository");
vi.mock("@/repositories/class.repository");
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

const subjectId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

const subjectRecord = {
  id: subjectId,
  name: "Physics",
  syllabus_link: "https://school.edu/syllabus/physics",
  reference_link: null,
  handout_link: "https://school.edu/handouts/physics",
  nb_sessions: 10,
  created_at: "2026-01-01T00:00:00.000Z",
};

const validCreateInput = {
  name: "Physics",
  syllabus_link: "https://school.edu/syllabus/physics",
  reference_link: "",
  handout_link: "https://school.edu/handouts/physics",
};

describe("listSubjectsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listSubjectsForManager(adminClient, null)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns subjects with class counts", async () => {
    vi.mocked(subjectRepository.listSubjects).mockResolvedValue({
      data: [subjectRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(classRepository.listClassSubjectIds).mockResolvedValue({
      data: [
        { subject_id: subjectId },
        { subject_id: subjectId },
        { subject_id: null },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const subjects = await listSubjectsForManager(adminClient, actor.userId);

    expect(subjects).toEqual([
      {
        id: subjectId,
        name: "Physics",
        syllabus_link: "https://school.edu/syllabus/physics",
        reference_link: null,
        handout_link: "https://school.edu/handouts/physics",
        nb_sessions: 10,
        created_at: "2026-01-01T00:00:00.000Z",
        class_count: 2,
      },
    ]);
  });

  it("returns an empty list when no subjects exist", async () => {
    vi.mocked(subjectRepository.listSubjects).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(classRepository.listClassSubjectIds).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const subjects = await listSubjectsForManager(adminClient, actor.userId);

    expect(subjects).toEqual([]);
  });
});

describe("createSubjectForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized when actor is not a manager", async () => {
    const result = await createSubjectForManager(
      adminClient,
      null,
      actor,
      validCreateInput
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("returns validation errors for invalid input", async () => {
    const result = await createSubjectForManager(
      adminClient,
      ROLES.MANAGER,
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

  it("returns field error when subject name already exists", async () => {
    vi.mocked(subjectRepository.findSubjectByName).mockResolvedValue({
      data: { id: subjectId, name: "Physics" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createSubjectForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      validCreateInput
    );

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { name: ["A subject with this name already exists."] },
    });
  });

  it("creates a subject", async () => {
    vi.mocked(subjectRepository.findSubjectByName).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(subjectRepository.createSubject).mockResolvedValue({
      data: subjectRecord,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    });

    const result = await createSubjectForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      validCreateInput
    );

    expect(result).toEqual({
      success: true,
      subject: {
        id: subjectId,
        name: "Physics",
        syllabus_link: "https://school.edu/syllabus/physics",
        reference_link: null,
        handout_link: "https://school.edu/handouts/physics",
        nb_sessions: 10,
        created_at: "2026-01-01T00:00:00.000Z",
        class_count: 0,
      },
      message: "Subject created.",
    });

    expect(subjectRepository.createSubject).toHaveBeenCalledWith(adminClient, {
      name: "Physics",
      syllabus_link: "https://school.edu/syllabus/physics",
      reference_link: null,
      handout_link: "https://school.edu/handouts/physics",
      nb_sessions: 0,
    });
  });
});

describe("getSubjectForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      getSubjectForManager(adminClient, null, subjectId)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns null when subject is missing", async () => {
    vi.mocked(subjectRepository.findSubjectById).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(classRepository.countClassesBySubjectId).mockResolvedValue({
      data: null,
      error: null,
      count: 0,
      status: 200,
      statusText: "OK",
    });

    const subject = await getSubjectForManager(
      adminClient,
      ROLES.MANAGER,
      subjectId
    );

    expect(subject).toBeNull();
  });

  it("returns subject with class count", async () => {
    vi.mocked(subjectRepository.findSubjectById).mockResolvedValue({
      data: subjectRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(classRepository.countClassesBySubjectId).mockResolvedValue({
      data: null,
      error: null,
      count: 3,
      status: 200,
      statusText: "OK",
    });

    const subject = await getSubjectForManager(
      adminClient,
      ROLES.MANAGER,
      subjectId
    );

    expect(subject).toEqual({
      id: subjectId,
      name: "Physics",
      syllabus_link: "https://school.edu/syllabus/physics",
      reference_link: null,
      handout_link: "https://school.edu/handouts/physics",
      nb_sessions: 10,
      created_at: "2026-01-01T00:00:00.000Z",
      class_count: 3,
    });
  });
});

describe("listSubjectClassesForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listSubjectClassesForManager(adminClient, null, subjectId)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns empty list when subject is missing", async () => {
    vi.mocked(subjectRepository.findSubjectById).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const classes = await listSubjectClassesForManager(
      adminClient,
      ROLES.MANAGER,
      subjectId
    );

    expect(classes).toEqual([]);
    expect(classRepository.listClassesBySubjectId).not.toHaveBeenCalled();
  });

  it("returns mapped classes for a subject", async () => {
    vi.mocked(subjectRepository.findSubjectById).mockResolvedValue({
      data: subjectRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(classRepository.listClassesBySubjectId).mockResolvedValue({
      data: [
        {
          id: "class-1",
          subject_id: subjectId,
          name: "Physics 101",
          status: "in_progress",
          semester_id: null,
          created_at: "2026-02-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const classes = await listSubjectClassesForManager(
      adminClient,
      ROLES.MANAGER,
      subjectId
    );

    expect(classes).toEqual([
      {
        id: "class-1",
        subject_id: subjectId,
        name: "Physics 101",
        status: "in_progress",
        created_at: "2026-02-01T00:00:00.000Z",
      },
    ]);
  });

  it("defaults unknown class status to scheduled", async () => {
    vi.mocked(subjectRepository.findSubjectById).mockResolvedValue({
      data: subjectRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(classRepository.listClassesBySubjectId).mockResolvedValue({
      data: [
        {
          id: "class-2",
          subject_id: subjectId,
          name: "Legacy Class",
          status: "active",
          semester_id: null,
          created_at: null,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const classes = await listSubjectClassesForManager(
      adminClient,
      ROLES.MANAGER,
      subjectId
    );

    expect(classes).toEqual([
      {
        id: "class-2",
        subject_id: subjectId,
        name: "Legacy Class",
        status: "scheduled",
        created_at: "",
      },
    ]);
  });
});

describe("deleteSubjectForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects non-managers", async () => {
    const result = await deleteSubjectForManager(
      adminClient,
      null,
      actor,
      subjectId
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(subjectRepository.deleteSubjectById).not.toHaveBeenCalled();
  });

  it("rejects when the subject is missing", async () => {
    vi.mocked(subjectRepository.findSubjectById).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const result = await deleteSubjectForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      subjectId
    );

    expect(result).toEqual({ success: false, error: "Subject not found." });
    expect(subjectRepository.deleteSubjectById).not.toHaveBeenCalled();
  });

  it("rejects when linked classes exist", async () => {
    vi.mocked(subjectRepository.findSubjectById).mockResolvedValue({
      data: subjectRecord,
      error: null,
    } as never);
    vi.mocked(classRepository.countClassesBySubjectId).mockResolvedValue({
      count: 2,
      error: null,
    } as never);

    const result = await deleteSubjectForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      subjectId
    );

    expect(result).toEqual({
      success: false,
      error: "Remove or reassign linked classes before deleting this subject.",
    });
    expect(subjectRepository.deleteSubjectById).not.toHaveBeenCalled();
  });

  it("deletes the subject and audits when no classes are linked", async () => {
    vi.mocked(subjectRepository.findSubjectById).mockResolvedValue({
      data: subjectRecord,
      error: null,
    } as never);
    vi.mocked(classRepository.countClassesBySubjectId).mockResolvedValue({
      count: 0,
      error: null,
    } as never);
    vi.mocked(subjectRepository.deleteSubjectById).mockResolvedValue({
      error: null,
    } as never);

    const result = await deleteSubjectForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      subjectId
    );

    expect(result).toEqual({
      success: true,
      message: "Subject deleted.",
    });
    expect(subjectRepository.deleteSubjectById).toHaveBeenCalledWith(
      adminClient,
      subjectId
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "delete",
        severity: "critical",
        table_name: "subjects",
        record_id: subjectId,
      })
    );
  });
});
