import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { SEMESTER_DROP_RESTRICTION_MODES } from "@/lib/manager/accounting/constants";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as authorizationService from "@/services/auth/authorization.service";
import { dropAllSemestersForManager } from "@/services/classes/drop-semester.service";
import * as teacherClassScope from "@/services/classes/teacher-class-scope.service";
import type { AuditActor } from "@/services/ops/audit-log.service";

vi.mock("@/services/auth/authorization.service", () => ({
  getUnauthorizedError: vi.fn(),
}));

vi.mock("@/services/classes/teacher-class-scope.service", () => ({
  assertAssignedTeacherForClassMutation: vi.fn(),
}));

vi.mock("@/repositories/semester-drop-request.repository", () => ({
  createSemesterDropRequest: vi.fn(),
  cancelSemesterDropRequest: vi.fn(),
  mapSemesterDropRequestRecord: vi.fn(),
}));

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
const semesterA = "22222222-2222-4222-8222-222222222222";
const semesterB = "33333333-3333-4333-8333-333333333333";
const classA = "44444444-4444-4444-8444-444444444444";
const classB = "55555555-5555-4555-8555-555555555555";
const membershipA = "66666666-6666-4666-8666-666666666666";

function completedDropResponse(id: string) {
  return {
    data: {
      request: {
        id,
        student_id: studentId,
        semester_id: semesterA,
        class_id: classA,
        payment_phase_id: null,
        spp_id: null,
        status: "completed",
        restriction_mode: "none",
        required_percent: null,
        required_amount: 0,
        phase_amount_snapshot: 0,
        requested_at: "2026-01-01T00:00:00.000Z",
        deadline_at: "2026-01-01T00:00:00.000Z",
        completed_at: "2026-01-01T00:00:00.000Z",
        refund_owed: 0,
        refund_status: "none",
        refunded_amount: 0,
        requested_by: actor.userId,
        notes: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      completedImmediately: true,
    },
    error: null,
  };
}

describe("dropAllSemestersForManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(
      null
    );
    vi.mocked(
      teacherClassScope.assertAssignedTeacherForClassMutation
    ).mockResolvedValue({ ok: true });
  });

  it("returns error when unauthorized", async () => {
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(
      "Unauthorized."
    );

    const result = await dropAllSemestersForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_id: studentId,
        targets: [{ semester_id: semesterA, origin_class_id: classA }],
        restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.NONE,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
      expect(result.completedCount).toBe(0);
    }
    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      actor.userId,
      PERMISSIONS.CLASSES_DROP_SEMESTER
    );
  });

  it("returns error when no targets", async () => {
    const result = await dropAllSemestersForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_id: studentId,
        targets: [],
        restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.NONE,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/No semesters/i);
      expect(result.completedCount).toBe(0);
    }
  });

  it("stops on first failure and reports completedCount", async () => {
    vi.mocked(semesterDropRequestRepository.createSemesterDropRequest)
      .mockResolvedValueOnce(completedDropResponse("drop-1") as never)
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Cannot complete immediately." },
      } as never);

    const result = await dropAllSemestersForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_id: studentId,
        targets: [
          {
            semester_id: semesterA,
            semester_name: "Fall A",
            origin_class_id: classA,
            origin_membership_id: membershipA,
          },
          {
            semester_id: semesterB,
            semester_name: "Fall B",
            origin_class_id: classB,
          },
        ],
        restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.NONE,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.completedCount).toBe(1);
      expect(result.failedSemesterId).toBe(semesterB);
      expect(result.error).toMatch(/Cannot complete immediately/i);
    }
    expect(
      semesterDropRequestRepository.createSemesterDropRequest
    ).toHaveBeenCalledTimes(2);
  });

  it("succeeds when every semester completes immediately", async () => {
    vi.mocked(
      semesterDropRequestRepository.createSemesterDropRequest
    ).mockResolvedValue(completedDropResponse("drop-ok") as never);

    const result = await dropAllSemestersForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_id: studentId,
        targets: [
          { semester_id: semesterA, origin_class_id: classA },
          { semester_id: semesterB, origin_class_id: classB },
        ],
        restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.NONE,
      }
    );

    expect(result).toEqual({
      success: true,
      completedCount: 2,
      message: "Dropped 2 semesters immediately.",
    });
    expect(
      semesterDropRequestRepository.createSemesterDropRequest
    ).toHaveBeenCalledTimes(2);
    expect(
      semesterDropRequestRepository.createSemesterDropRequest
    ).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        student_id: studentId,
        require_immediate: true,
        restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.NONE,
      })
    );
  });
});
