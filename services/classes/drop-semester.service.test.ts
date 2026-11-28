import { beforeEach, describe, expect, it, vi } from "vitest";
import { SEMESTER_DROP_RESTRICTION_MODES } from "@/lib/manager/accounting/constants";
import * as classRepository from "@/repositories/class.repository";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as authorizationService from "@/services/auth/authorization.service";
import {
  createImmediateSemesterDropsBatchForInactivate,
  createSemesterDropForManager,
} from "@/services/classes/drop-semester.service";
import * as teacherClassScope from "@/services/classes/teacher-class-scope.service";
import type { AuditActor } from "@/services/ops/audit-log.service";

vi.mock("@/services/auth/authorization.service", () => ({
  getUnauthorizedError: vi.fn(),
}));

vi.mock("@/services/classes/teacher-class-scope.service", () => ({
  assertAssignedTeacherForClassMutation: vi.fn(),
}));

vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/semester-drop-request.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn(),
}));
vi.mock("@/lib/debug/nav-timing", () => ({
  createNavStepTimer: () => ({
    step: async (_name: string, fn: () => unknown) => fn(),
    end: () => undefined,
  }),
}));

const actor: AuditActor = {
  userId: "actor-1",
  email: "mgr@example.com",
  role: "manager",
};

const adminClient = {} as never;
const studentId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";
const membershipId = "33333333-3333-4333-8333-333333333333";
const semesterId = "44444444-4444-4444-8444-444444444444";

describe("createSemesterDropForManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(
      null
    );
    vi.mocked(
      teacherClassScope.assertAssignedTeacherForClassMutation
    ).mockResolvedValue({ ok: true });
  });

  it("maps amount-over-due SQL errors to fieldErrors", async () => {
    vi.mocked(
      semesterDropRequestRepository.createSemesterDropRequest
    ).mockResolvedValue({
      data: null,
      error: {
        message: "Required amount cannot exceed the amount due (100).",
      },
    } as never);

    const result = await createSemesterDropForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_id: studentId,
        class_id: classId,
        restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.AMOUNT,
        required_amount: 150,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.required_amount?.[0]).toMatch(/amount due/i);
    }
  });

  it("NO_SPP fallback fails when atomic leave+withdraw fails", async () => {
    vi.mocked(
      semesterDropRequestRepository.createSemesterDropRequest
    ).mockResolvedValue({
      data: null,
      error: { message: "NO_SPP" },
    } as never);
    vi.mocked(classRepository.findClassById).mockResolvedValue({
      data: { id: classId, semester_id: semesterId },
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.leaveAndWithdrawSemesterNoSpp
    ).mockResolvedValue({
      data: null,
      error: { message: "withdraw failed" },
    } as never);

    const result = await createSemesterDropForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_id: studentId,
        class_id: classId,
        membership_id: membershipId,
        restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.NONE,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/withdraw failed/i);
    }
  });

  it("NO_SPP fallback uses atomic leave+withdraw and returns removed memberships", async () => {
    vi.mocked(
      semesterDropRequestRepository.createSemesterDropRequest
    ).mockResolvedValue({
      data: null,
      error: { message: "NO_SPP" },
    } as never);
    vi.mocked(classRepository.findClassById).mockResolvedValue({
      data: { id: classId, semester_id: semesterId },
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.leaveAndWithdrawSemesterNoSpp
    ).mockResolvedValue({
      data: {
        removedCount: 2,
        removed: [
          { classId, membershipId },
          {
            classId: "66666666-6666-4666-8666-666666666666",
            membershipId: "77777777-7777-4777-8777-777777777777",
          },
        ],
      },
      error: null,
    } as never);

    const result = await createSemesterDropForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_id: studentId,
        class_id: classId,
        membership_id: membershipId,
        restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.NONE,
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.completedImmediately).toBe(true);
      expect(result.removedMembershipIds).toHaveLength(2);
      expect(result.removedClassIds).toContain(classId);
    }
    expect(
      studentClassRepository.leaveAndWithdrawSemesterNoSpp
    ).toHaveBeenCalledWith(adminClient, studentId, semesterId, classId);
  });
});

describe("createImmediateSemesterDropsBatchForInactivate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls atomic batch RPC for multiple targets", async () => {
    vi.mocked(
      semesterDropRequestRepository.createImmediateSemesterDropsBatch
    ).mockResolvedValue({
      data: { completedCount: 2, results: [] },
      error: null,
    } as never);

    const result = await createImmediateSemesterDropsBatchForInactivate(
      adminClient,
      actor.userId,
      actor,
      {
        student_id: studentId,
        targets: [
          { class_id: classId, semester_id: semesterId },
          {
            class_id: "88888888-8888-4888-8888-888888888888",
            semester_id: "99999999-9999-4999-8999-999999999999",
          },
        ],
        restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.NONE,
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.completedCount).toBe(2);
    }
    expect(
      semesterDropRequestRepository.createImmediateSemesterDropsBatch
    ).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        student_id: studentId,
        class_ids: [classId, "88888888-8888-4888-8888-888888888888"],
        restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.NONE,
      })
    );
  });

  it("returns completedCount 0 when batch RPC fails", async () => {
    vi.mocked(
      semesterDropRequestRepository.createImmediateSemesterDropsBatch
    ).mockResolvedValue({
      data: null,
      error: { message: "Drop cannot complete immediately." },
    } as never);

    const result = await createImmediateSemesterDropsBatchForInactivate(
      adminClient,
      actor.userId,
      actor,
      {
        student_id: studentId,
        targets: [
          { class_id: classId },
          { class_id: "88888888-8888-4888-8888-888888888888" },
        ],
        restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.NONE,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.completedCount).toBe(0);
    }
  });
});
