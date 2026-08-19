import { beforeEach, describe, expect, it, vi } from "vitest";
import * as classRepository from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as accountingSync from "@/services/accounting/accounting-sync.service";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import { updateClassStatusForManager } from "@/services/classes/class.service";

vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/class-teacher.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/services/accounting/accounting-sync.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/accounting/accounting-sync.service")>();
  return {
    ...actual,
    backfillSppsForClassBecomeInProgress: vi.fn(),
    onStudentJoinedClass: vi.fn(),
    onStudentLeftClass: vi.fn(),
  };
});
vi.mock("@/services/students/student.service", () => ({
  listStudentsForManager: vi.fn(),
}));
vi.mock("@/services/classes/session.service", () => ({
  seedLateJoinAttendeesForStudent: vi.fn(),
  seedLateJoinStudentTasksForStudent: vi.fn(),
  ensureSessionAttendeesForMembers: vi.fn(),
}));
vi.mock("@/services/classes/class-computed-grade-lock.service", () => ({
  assertClassStructureUnlockedForComputedGrades: vi.fn(),
  assertStudentGradeInputsUnlockedForComputedGrade: vi.fn(),
}));
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

const classId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherClassId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const semesterId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const classDetail = {
  id: classId,
  subject_id: "subject-1",
  name: "Math A",
  status: "scheduled",
  semester_id: semesterId,
  created_at: "2026-01-01T00:00:00.000Z",
  subjects: { name: "Mathematics", nb_sessions: 12 },
  semesters: { name: "Fall 2026" },
};

describe("updateClassStatusForManager accounting gates", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    vi.mocked(
      accountingSync.backfillSppsForClassBecomeInProgress
    ).mockResolvedValue({
      ensuredCount: 0,
      createdCount: 0,
      reactivatedCount: 0,
    });
    vi.mocked(
      studentClassRepository.countStudentClassesByClassId
    ).mockResolvedValue({
      count: 0,
      error: null,
      data: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      classTeacherRepository.countClassTeachersByClassId
    ).mockResolvedValue({
      count: 0,
      error: null,
      data: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(sessionRepository.listSessionCountsByClassIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);
  });

  it("rejects a second in-progress class on the same semester", async () => {
    vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
      data: classDetail,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      classRepository.findOtherInProgressClassBySemesterId
    ).mockResolvedValue({
      data: {
        id: otherClassId,
        subject_id: null,
        name: "Math B",
        status: "in_progress",
        semester_id: semesterId,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await updateClassStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { class_id: classId, status: "in_progress" }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.status?.[0]).toMatch(/already has an in-progress/i);
    }
    expect(classRepository.updateClassStatus).not.toHaveBeenCalled();
    expect(
      accountingSync.backfillSppsForClassBecomeInProgress
    ).not.toHaveBeenCalled();
  });

  it("backfills SPPs when a class becomes in_progress", async () => {
    vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
      data: classDetail,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      classRepository.findOtherInProgressClassBySemesterId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(classRepository.updateClassStatus).mockResolvedValue({
      data: { ...classDetail, status: "in_progress" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await updateClassStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { class_id: classId, status: "in_progress" }
    );

    expect(result.success).toBe(true);
    expect(
      accountingSync.backfillSppsForClassBecomeInProgress
    ).toHaveBeenCalledWith(adminClient, classId, actor);
  });

  it("returns warning when in_progress backfill fails", async () => {
    vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
      data: classDetail,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      classRepository.findOtherInProgressClassBySemesterId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(classRepository.updateClassStatus).mockResolvedValue({
      data: { ...classDetail, status: "in_progress" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      accountingSync.backfillSppsForClassBecomeInProgress
    ).mockRejectedValue(new Error("sync boom"));

    const result = await updateClassStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { class_id: classId, status: "in_progress" }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.warning).toMatch(/Payment sync failed/i);
    }
  });
});
