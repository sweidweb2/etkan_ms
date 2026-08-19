import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildStudentAuditLogsOrFilter,
  DEFAULT_STUDENT_ACTIVITY_LIMIT,
} from "@/repositories/audit-log.repository";
import * as auditLogRepository from "@/repositories/audit-log.repository";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import * as studentFinancialAdjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import {
  listStudentActivityForManager,
  listStudentActivityForSelf,
} from "@/services/student-activity.service";
import { ROLES } from "@/lib/constants/roles";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

vi.mock("@/repositories/audit-log.repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/repositories/audit-log.repository")
  >("@/repositories/audit-log.repository");
  return {
    ...actual,
    listAuditLogsRelatedToStudent: vi.fn(),
  };
});

vi.mock("@/repositories/student-payment-phase.repository", () => ({
  listSppIdsByStudentId: vi.fn(),
}));

vi.mock("@/repositories/student-payment.repository", () => ({
  listPaymentIdsBySppIds: vi.fn(),
}));

vi.mock("@/repositories/student-financial-adjustment.repository", () => ({
  listAdjustmentIdsBySppIds: vi.fn(),
}));

vi.mock("@/repositories/attendee.repository", () => ({
  listAttendeeIdsByStudentId: vi.fn(),
}));

vi.mock("@/repositories/student-task.repository", () => ({
  listStudentTaskIdsByStudentId: vi.fn(),
}));

vi.mock("@/repositories/final-exam.repository", () => ({
  listStudentFinalExamGradeIdsByStudentId: vi.fn(),
}));

vi.mock("@/repositories/student-class.repository", () => ({
  listStudentClassesByUserId: vi.fn(),
}));

vi.mock("@/repositories/student-course-grade.repository", () => ({
  listStudentCourseGradeIdsByUserId: vi.fn(),
}));

vi.mock("@/repositories/profile.repository", () => ({
  findProfileById: vi.fn(),
}));

vi.mock("@/services/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
}));

const adminClient = {} as SupabaseClient<Database>;
const actorUserId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const studentUserId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function mockEmptyRelatedIds() {
  vi.mocked(studentPaymentPhaseRepository.listSppIdsByStudentId).mockResolvedValue({
    data: [],
    error: null,
  } as never);
  vi.mocked(studentPaymentRepository.listPaymentIdsBySppIds).mockResolvedValue({
    data: [],
    error: null,
  } as never);
  vi.mocked(
    studentFinancialAdjustmentRepository.listAdjustmentIdsBySppIds
  ).mockResolvedValue({ data: [], error: null } as never);
  vi.mocked(attendeeRepository.listAttendeeIdsByStudentId).mockResolvedValue({
    data: [],
    error: null,
  } as never);
  vi.mocked(studentTaskRepository.listStudentTaskIdsByStudentId).mockResolvedValue({
    data: [],
    error: null,
  } as never);
  vi.mocked(
    finalExamRepository.listStudentFinalExamGradeIdsByStudentId
  ).mockResolvedValue({ data: [], error: null } as never);
  vi.mocked(studentClassRepository.listStudentClassesByUserId).mockResolvedValue({
    data: [],
    error: null,
  } as never);
  vi.mocked(
    studentCourseGradeRepository.listStudentCourseGradeIdsByUserId
  ).mockResolvedValue({ data: [], error: null } as never);
}

describe("buildStudentAuditLogsOrFilter", () => {
  it("includes JSON student_id and user_id paths", () => {
    const filter = buildStudentAuditLogsOrFilter({
      studentUserId,
    });

    expect(filter).toContain(`metadata->>student_id.eq.${studentUserId}`);
    expect(filter).toContain(`new_data->>student_id.eq.${studentUserId}`);
    expect(filter).toContain(`old_data->>student_id.eq.${studentUserId}`);
    expect(filter).toContain(`new_data->>user_id.eq.${studentUserId}`);
    expect(filter).toContain(`old_data->>user_id.eq.${studentUserId}`);
  });

  it("appends related-id table groups when non-empty", () => {
    const filter = buildStudentAuditLogsOrFilter({
      studentUserId,
      relatedByTable: [
        { tableName: "student_payments", recordIds: ["pay-1", "pay-2"] },
        { tableName: "attendee", recordIds: [] },
      ],
    });

    expect(filter).toContain(
      "and(table_name.eq.student_payments,record_id.in.(pay-1,pay-2))"
    );
    expect(filter).not.toContain("table_name.eq.attendee");
  });
});

describe("listStudentActivityForManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmptyRelatedIds();
  });

  it("returns mapped rows for JSON-style hits", async () => {
    vi.mocked(auditLogRepository.listAuditLogsRelatedToStudent).mockResolvedValue({
      data: [
        {
          id: "log-json",
          user_id: actorUserId,
          user_label: "Manager",
          action: "insert",
          severity: "info",
          table_name: "student_class",
          record_id: "sc-1",
          old_data: null,
          new_data: { student_id: studentUserId },
          metadata: { note: "Joined class" },
          created_at: "2026-07-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);

    const rows = await listStudentActivityForManager(
      adminClient,
      actorUserId,
      studentUserId
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.summary).toBe("Joined class");
    expect(rows[0]?.actor_label).toBe("Manager");
    expect(auditLogRepository.listAuditLogsRelatedToStudent).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        studentUserId,
        relatedByTable: [],
      })
    );
  });

  it("expands related payment ids into the audit query", async () => {
    vi.mocked(studentPaymentPhaseRepository.listSppIdsByStudentId).mockResolvedValue({
      data: [{ id: "spp-1" }],
      error: null,
    } as never);
    vi.mocked(studentPaymentRepository.listPaymentIdsBySppIds).mockResolvedValue({
      data: [{ id: "pay-1" }],
      error: null,
    } as never);

    vi.mocked(auditLogRepository.listAuditLogsRelatedToStudent).mockResolvedValue({
      data: [
        {
          id: "log-pay",
          user_id: actorUserId,
          user_label: "Manager",
          action: "insert",
          severity: "info",
          table_name: "student_payments",
          record_id: "pay-1",
          old_data: null,
          new_data: { amount: 100 },
          metadata: null,
          created_at: "2026-07-02T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);

    const rows = await listStudentActivityForManager(
      adminClient,
      actorUserId,
      studentUserId
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.table_name).toBe("student_payments");
    expect(auditLogRepository.listAuditLogsRelatedToStudent).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        studentUserId,
        relatedByTable: expect.arrayContaining([
          {
            tableName: "student_payment_phases",
            recordIds: ["spp-1"],
          },
          {
            tableName: "student_payments",
            recordIds: ["pay-1"],
          },
        ]),
      })
    );
  });

  it("returns empty list when no audits match", async () => {
    vi.mocked(auditLogRepository.listAuditLogsRelatedToStudent).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const rows = await listStudentActivityForManager(
      adminClient,
      actorUserId,
      studentUserId
    );

    expect(rows).toEqual([]);
    expect(DEFAULT_STUDENT_ACTIVITY_LIMIT).toBe(50);
  });
});

describe("listStudentActivityForSelf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmptyRelatedIds();
  });

  it("allows the student to load their own activity", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: { id: studentUserId, username: "stu", role: ROLES.STUDENT, created_at: "" },
      error: null,
    } as never);
    vi.mocked(auditLogRepository.listAuditLogsRelatedToStudent).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    await expect(
      listStudentActivityForSelf(adminClient, studentUserId)
    ).resolves.toEqual([]);
  });

  it("rejects non-student sessions", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: actorUserId,
        username: "mgr",
        role: ROLES.MANAGER,
        created_at: "",
      },
      error: null,
    } as never);

    await expect(
      listStudentActivityForSelf(adminClient, actorUserId)
    ).rejects.toThrow("Unauthorized.");
  });
});
