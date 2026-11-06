import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import * as studentClassRepository from "@/repositories/student-class.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  applyClassTaskStart,
  applyCreateClassTask,
} from "@/services/classes/class-tasks.service";
import { applyAttendeeUpdate } from "@/services/classes/session-tasks.service";
import {
  TEAM_LEADER_REQUIRED_MESSAGE,
  createClassTaskForTeamLeader,
  setStudentTeamLeaderForStaff,
  startClassTaskForTeamLeader,
  updateAttendeeForTeamLeader,
} from "@/services/classes/class-team-leader.service";
import type { AuditActor } from "@/services/ops/audit-log.service";

vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/class-task.repository");
vi.mock("@/repositories/attendee.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/services/classes/class-tasks.service", () => ({
  applyClassTaskStart: vi.fn(),
  applyCreateClassTask: vi.fn(),
  applyUpdateClassTask: vi.fn(),
}));
vi.mock("@/services/classes/session-tasks.service", () => ({
  applyAttendeeUpdate: vi.fn(),
}));
vi.mock("@/services/classes/class-computed-grade-lock.service", () => ({
  getClassComputedGradeLockState: vi.fn(),
}));
vi.mock("@/services/classes/session-seed.service", () => ({
  ensureSessionAttendeesForMembers: vi.fn(),
}));
vi.mock("@/services/classes/teacher-class-scope.service", () => ({
  assertAssignedTeacherForClassMutation: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  getUnauthorizedError: vi.fn(),
  hasAnyPermission: vi.fn(),
  assertStudentSelfAccess: vi.fn(async (_c, userId) => userId),
}));

const adminClient = {} as never;
const studentUserId = "11111111-1111-4111-8111-111111111111";
const classId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherClassId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const sessionId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const attendeeId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const taskId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const enrollmentId = "f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1";

const actor: AuditActor = {
  userId: studentUserId,
  userLabel: "Student",
  role: ROLES.STUDENT,
};

function mockMembership(isTeamLeader: boolean | null) {
  vi.mocked(
    studentClassRepository.findStudentClassByUserAndClass
  ).mockResolvedValue({
    data:
      isTeamLeader === null
        ? null
        : {
            id: enrollmentId,
            user_id: studentUserId,
            class_id: classId,
            joined_at: null,
            is_team_leader: isTeamLeader,
          },
    error: null,
  } as never);
}

const attendeeInput = {
  id: attendeeId,
  class_id: classId,
  session_id: sessionId,
  status: "absent" as const,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getUnauthorizedError).mockResolvedValue(null);
});

describe("team leader gate", () => {
  it("denies when the flag is off", async () => {
    mockMembership(false);

    const result = await updateAttendeeForTeamLeader(
      adminClient,
      actor,
      attendeeInput
    );

    expect(result).toEqual({
      success: false,
      error: TEAM_LEADER_REQUIRED_MESSAGE,
    });
    expect(applyAttendeeUpdate).not.toHaveBeenCalled();
  });

  it("denies a student who is not in the class", async () => {
    mockMembership(null);

    const result = await createClassTaskForTeamLeader(adminClient, actor, {
      class_id: classId,
      title: "Homework",
      period: 7,
    });

    expect(result).toEqual({
      success: false,
      error: TEAM_LEADER_REQUIRED_MESSAGE,
    });
    expect(applyCreateClassTask).not.toHaveBeenCalled();
  });

  it("denies when the role permission is missing, even with the flag on", async () => {
    vi.mocked(getUnauthorizedError).mockResolvedValue("Unauthorized.");
    mockMembership(true);

    const result = await updateAttendeeForTeamLeader(
      adminClient,
      actor,
      attendeeInput
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(
      studentClassRepository.findStudentClassByUserAndClass
    ).not.toHaveBeenCalled();
    expect(applyAttendeeUpdate).not.toHaveBeenCalled();
  });

  it("checks the matching team-leader permission", async () => {
    mockMembership(true);
    vi.mocked(applyClassTaskStart).mockResolvedValue({
      success: true,
      task: {} as never,
      message: "Task started.",
    });

    await startClassTaskForTeamLeader(adminClient, actor, {
      id: taskId,
      class_id: classId,
    });

    expect(getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      studentUserId,
      PERMISSIONS.TEAM_LEADER_TASKS_START
    );
  });
});

describe("updateAttendeeForTeamLeader", () => {
  it("lets the team leader update their own attendance", async () => {
    mockMembership(true);
    vi.mocked(applyAttendeeUpdate).mockResolvedValue({
      success: true,
      attendee: {
        id: attendeeId,
        session_id: sessionId,
        student_id: studentUserId,
        full_name: "Team Leader",
        email: "leader@example.com",
        status: "absent",
        created_at: "2026-11-01T00:00:00.000Z",
      },
      message: "Attendance updated.",
    });

    const result = await updateAttendeeForTeamLeader(
      adminClient,
      actor,
      attendeeInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.attendee.student_id).toBe(studentUserId);
      expect(result.attendee.email).toBe("");
    }
  });

  it("scopes the shared core to the gated class only", async () => {
    mockMembership(true);
    vi.mocked(applyAttendeeUpdate).mockResolvedValue({
      success: false,
      error: "noop",
    });

    await updateAttendeeForTeamLeader(adminClient, actor, attendeeInput);

    const authorizeClass = vi.mocked(applyAttendeeUpdate).mock.calls[0][3];
    await expect(authorizeClass(classId)).resolves.toEqual({ ok: true });
    await expect(authorizeClass(otherClassId)).resolves.toEqual({
      ok: false,
      error: TEAM_LEADER_REQUIRED_MESSAGE,
    });
  });
});

describe("startClassTaskForTeamLeader", () => {
  it("only ever starts a task (never un-starts)", async () => {
    mockMembership(true);
    vi.mocked(applyClassTaskStart).mockResolvedValue({
      success: true,
      task: {} as never,
      message: "Task started.",
    });

    await startClassTaskForTeamLeader(adminClient, actor, {
      id: taskId,
      class_id: classId,
      started: false,
    } as never);

    expect(applyClassTaskStart).toHaveBeenCalledWith(
      adminClient,
      actor,
      { id: taskId, class_id: classId, started: true },
      expect.any(Function)
    );
  });
});

describe("setStudentTeamLeaderForStaff", () => {
  const manager: AuditActor = {
    userId: "99999999-9999-4999-8999-999999999999",
    userLabel: "Manager",
    role: ROLES.MANAGER,
  };

  it("rejects an enrollment row from another class", async () => {
    vi.mocked(studentClassRepository.findStudentClassById).mockResolvedValue({
      data: {
        id: enrollmentId,
        user_id: studentUserId,
        class_id: otherClassId,
        joined_at: null,
        is_team_leader: false,
      },
      error: null,
    } as never);

    const result = await setStudentTeamLeaderForStaff(
      adminClient,
      manager.userId,
      manager,
      { class_id: classId, student_class_id: enrollmentId, is_team_leader: true }
    );

    expect(result).toEqual({
      success: false,
      error: "Student not found in this class.",
    });
    expect(
      studentClassRepository.updateStudentClassTeamLeader
    ).not.toHaveBeenCalled();
  });

  it("updates the flag for a row in the class", async () => {
    vi.mocked(studentClassRepository.findStudentClassById).mockResolvedValue({
      data: {
        id: enrollmentId,
        user_id: studentUserId,
        class_id: classId,
        joined_at: null,
        is_team_leader: false,
      },
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.updateStudentClassTeamLeader
    ).mockResolvedValue({
      data: {
        id: enrollmentId,
        user_id: studentUserId,
        class_id: classId,
        joined_at: null,
        is_team_leader: true,
      },
      error: null,
    } as never);

    const result = await setStudentTeamLeaderForStaff(
      adminClient,
      manager.userId,
      manager,
      { class_id: classId, student_class_id: enrollmentId, is_team_leader: true }
    );

    expect(result).toMatchObject({ success: true, isTeamLeader: true });
    expect(getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      manager.userId,
      PERMISSIONS.CLASSES_SET_TEAM_LEADER
    );
  });
});
