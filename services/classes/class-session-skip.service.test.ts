import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLASS_WEEK_SKIP_BLOCKED_REASONS } from "@/lib/constants/class-session-skips";
import { ROLES } from "@/lib/constants/roles";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as classRepository from "@/repositories/class.repository";
import * as classSessionSkipRepository from "@/repositories/class-session-skip.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as notificationService from "@/services/communications/notification.service";
import * as teacherClassScope from "@/services/classes/teacher-class-scope.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  skipClassWeekForManager,
  unskipClassWeekForManager,
} from "@/services/classes/class-session-skip.service";

vi.mock("@/repositories/attendee.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/class-session-skip.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/communications/notification.service", () => ({
  notifyManagersOfClassWeekSkipChange: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/services/classes/class-computed-grade-lock.service", () => ({
  getClassComputedGradeLockState: vi
    .fn()
    .mockResolvedValue({ hasComputedGrades: false, lockedUserIds: [] }),
}));
vi.mock("@/services/classes/teacher-class-scope.service", () => ({
  assertAssignedTeacherForClassMutation: vi.fn(),
}));
vi.mock("@/services/auth/authorization.service", () => ({
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const classId = "c1c2c3c4-d5e6-4890-abcd-ef1234567890";
const latestSessionId = "a1a2b3c4-d5e6-4890-abcd-ef1234567890";

const teacher: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Teacher T",
  role: ROLES.TEACHER,
};

const manager: AuditActor = {
  userId: "22222222-2222-4222-8222-222222222222",
  userLabel: "Manager M",
  role: ROLES.MANAGER,
};

const sessions = [
  {
    id: "b1b2b3c4-d5e6-4890-abcd-ef1234567890",
    class_id: classId,
    nb_order: 1,
    topic: "S1",
    session_report: null,
    starts_at: "2026-10-31T08:00:00.000Z",
    ends_at: "2026-11-07T08:00:00.000Z",
    semester_id: null,
    group_grade_level: null,
    created_at: "2026-10-31T00:00:00.000Z",
  },
  {
    id: latestSessionId,
    class_id: classId,
    nb_order: 2,
    topic: "S2",
    session_report: null,
    starts_at: "2026-11-07T08:00:00.000Z",
    ends_at: "2026-11-14T08:00:00.000Z",
    semester_id: null,
    group_grade_level: null,
    created_at: "2026-11-05T00:00:00.000Z",
  },
];

function mockClassData(options: {
  skips?: Array<{ skip_date: string; reason: string | null }>;
  attendanceChanges?: number;
} = {}) {
  vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
    data: {
      id: classId,
      name: "Math 101",
      status: "in_progress",
      subjects: { name: "Math", nb_sessions: 12 },
    },
    error: null,
  } as never);
  vi.mocked(sessionRepository.listSessionsByClassId).mockResolvedValue({
    data: sessions,
    error: null,
  } as never);
  vi.mocked(
    classSessionSkipRepository.listClassSessionSkipsByClassId
  ).mockResolvedValue({ data: options.skips ?? [], error: null } as never);
  vi.mocked(attendeeRepository.countSessionAttendeesNotInStatus).mockResolvedValue(
    { count: options.attendanceChanges ?? 0, error: null } as never
  );
}

describe("class session skips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T10:00:00.000Z"));
    vi.mocked(
      teacherClassScope.assertAssignedTeacherForClassMutation
    ).mockResolvedValue({ ok: true });
    vi.mocked(classSessionSkipRepository.skipClassWeek).mockResolvedValue({
      data: "skip-id",
      error: null,
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects actors without the skip permission", async () => {
    const result = await skipClassWeekForManager(
      {} as never,
      { ...teacher, userId: null },
      { class_id: classId, skip_date: "2026-11-14" }
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("rejects teachers who are not assigned to the class", async () => {
    vi.mocked(
      teacherClassScope.assertAssignedTeacherForClassMutation
    ).mockResolvedValue({ ok: false, error: "Not assigned." });

    const result = await skipClassWeekForManager({} as never, teacher, {
      class_id: classId,
      skip_date: "2026-11-14",
    });

    expect(result).toEqual({ success: false, error: "Not assigned." });
    expect(classSessionSkipRepository.skipClassWeek).not.toHaveBeenCalled();
  });

  it("skips a future week and notifies managers when a teacher does it", async () => {
    mockClassData();

    const result = await skipClassWeekForManager({} as never, teacher, {
      class_id: classId,
      skip_date: "2026-11-21",
      reason: "Exam week",
    });

    expect(result.success).toBe(true);
    expect(classSessionSkipRepository.skipClassWeek).toHaveBeenCalledWith(
      {},
      {
        classId,
        skipDate: "2026-11-21",
        reason: "Exam week",
        createdBy: teacher.userId,
        sessionId: null,
      }
    );
    expect(
      notificationService.notifyManagersOfClassWeekSkipChange
    ).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ classId, skipDate: "2026-11-21", isSkipped: true })
    );
  });

  it("rejects dates outside the skip horizon", async () => {
    mockClassData();

    const result = await skipClassWeekForManager({} as never, manager, {
      class_id: classId,
      skip_date: "2026-12-26",
    });

    expect(result.success).toBe(false);
    expect(classSessionSkipRepository.skipClassWeek).not.toHaveBeenCalled();
  });

  it("enforces the consecutive limit for teachers only", async () => {
    mockClassData({
      skips: [
        { skip_date: "2026-11-14", reason: null },
        { skip_date: "2026-11-21", reason: null },
      ],
    });

    const teacherResult = await skipClassWeekForManager({} as never, teacher, {
      class_id: classId,
      skip_date: "2026-11-28",
    });
    expect(teacherResult).toEqual({
      success: false,
      error: CLASS_WEEK_SKIP_BLOCKED_REASONS.CONSECUTIVE_LIMIT,
    });

    const managerResult = await skipClassWeekForManager({} as never, manager, {
      class_id: classId,
      skip_date: "2026-11-28",
    });
    expect(managerResult.success).toBe(true);
    expect(
      notificationService.notifyManagersOfClassWeekSkipChange
    ).not.toHaveBeenCalled();
  });

  it("skips the latest pre-created session by deleting it with the skip", async () => {
    mockClassData();

    const result = await skipClassWeekForManager({} as never, teacher, {
      class_id: classId,
      skip_date: "2000-01-01",
      session_id: latestSessionId,
    });

    expect(result).toMatchObject({
      success: true,
      deletedSessionId: latestSessionId,
    });
    expect(classSessionSkipRepository.skipClassWeek).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        skipDate: "2026-11-07",
        sessionId: latestSessionId,
      })
    );
  });

  it("refuses to skip the latest session once attendance was changed", async () => {
    mockClassData({ attendanceChanges: 2 });

    const result = await skipClassWeekForManager({} as never, teacher, {
      class_id: classId,
      skip_date: "2026-11-07",
      session_id: latestSessionId,
    });

    expect(result).toEqual({
      success: false,
      error: CLASS_WEEK_SKIP_BLOCKED_REASONS.SESSION_STARTED_WORK,
    });
  });

  it("refuses to skip a session that is not the latest", async () => {
    mockClassData();

    const result = await skipClassWeekForManager({} as never, manager, {
      class_id: classId,
      skip_date: "2026-10-31",
      session_id: sessions[0]!.id,
    });

    expect(result).toEqual({
      success: false,
      error: CLASS_WEEK_SKIP_BLOCKED_REASONS.NOT_LATEST_SESSION,
    });
  });

  it("restores a week and creates its session right away when it is due", async () => {
    mockClassData({ skips: [{ skip_date: "2026-11-07", reason: null }] });
    vi.mocked(classSessionSkipRepository.findClassSessionSkip).mockResolvedValue({
      data: { id: "skip-id", reason: null },
      error: null,
    } as never);
    vi.mocked(
      classSessionSkipRepository.deleteClassSessionSkipById
    ).mockResolvedValue({ error: null } as never);
    vi.mocked(
      classSessionSkipRepository.createNextWeeklySessionForClass
    ).mockResolvedValue({ data: latestSessionId, error: null } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessions[1],
      error: null,
    } as never);

    const result = await unskipClassWeekForManager({} as never, teacher, {
      class_id: classId,
      skip_date: "2026-11-07",
    });

    expect(
      classSessionSkipRepository.createNextWeeklySessionForClass
    ).toHaveBeenCalledWith({}, classId, 2);
    expect(result).toMatchObject({
      success: true,
      createdSession: { id: latestSessionId, topic: "S2" },
    });
  });

  it("does not restore past weeks", async () => {
    const result = await unskipClassWeekForManager({} as never, manager, {
      class_id: classId,
      skip_date: "2026-10-01",
    });

    expect(result).toEqual({
      success: false,
      error: "Past weeks cannot be restored.",
    });
  });
});
