import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  getClassForManager,
  loadClassStudentRows,
} from "@/services/classes/class-queries.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/attendee.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/class-teacher.repository");
vi.mock("@/repositories/class-task.repository");
vi.mock("@/repositories/final-exam.repository");
vi.mock("@/repositories/payment-phase.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/semester.repository");
vi.mock("@/repositories/semester-drop-request.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/repositories/student-payment.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/repositories/subject.repository");
vi.mock("@/services/students/student.service", () => ({
  hydrateStudentRows: vi.fn(),
  listStudentsForManager: vi.fn(),
}));
vi.mock("@/services/classes/class-enrollment.service", () => ({
  resolveActiveStudentDiff: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({}),
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
const actorUserId = "11111111-1111-4111-8111-111111111111";
const classId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const enrollmentId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const semesterId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const classDetail = {
  id: classId,
  name: "Robotics A",
  subject_id: "subject-1",
  semester_id: semesterId,
  status: CLASS_STATUSES.IN_PROGRESS,
  image_url: null,
  card_gradient: null,
  created_at: "2026-01-01T00:00:00.000Z",
  subjects: { name: "Robotics", nb_sessions: 10 },
  semesters: { name: "Fall 2026" },
};

describe("getClassForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
      data: classDetail,
      error: null,
    } as never);
  });

  it("skips enrollment/teacher/session count queries when includeCounts is false", async () => {
    const row = await getClassForManager(adminClient, actorUserId, classId, {
      includeCounts: false,
    });

    expect(row).toMatchObject({
      id: classId,
      name: "Robotics A",
      enrollment_count: 0,
      teacher_count: 0,
      completed_sessions: 0,
    });
    expect(
      studentClassRepository.countStudentClassesByClassId
    ).not.toHaveBeenCalled();
    expect(
      classTeacherRepository.countClassTeachersByClassId
    ).not.toHaveBeenCalled();
    expect(sessionRepository.listSessionCountsByClassIds).not.toHaveBeenCalled();
  });

  it("loads counts when includeCounts is omitted", async () => {
    vi.mocked(
      studentClassRepository.countStudentClassesByClassId
    ).mockResolvedValue({ count: 3, error: null } as never);
    vi.mocked(
      classTeacherRepository.countClassTeachersByClassId
    ).mockResolvedValue({ count: 2, error: null } as never);
    vi.mocked(sessionRepository.listSessionCountsByClassIds).mockResolvedValue({
      data: [{ class_id: classId }, { class_id: classId }],
      error: null,
    } as never);

    const row = await getClassForManager(adminClient, actorUserId, classId);

    expect(row?.enrollment_count).toBe(3);
    expect(row?.teacher_count).toBe(2);
    expect(row?.completed_sessions).toBe(2);
    expect(
      studentClassRepository.countStudentClassesByClassId
    ).toHaveBeenCalled();
  });
});

describe("loadClassStudentRows", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(
      studentClassRepository.listStudentClassesByClassId
    ).mockResolvedValue({
      data: [
        {
          id: enrollmentId,
          class_id: classId,
          user_id: userId,
          joined_at: "2026-02-01T00:00:00.000Z",
          is_team_leader: false,
        },
      ],
      error: null,
    } as never);
    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([[userId, "student@school.com"]]),
      error: null,
    });
  });

  it("keeps orphan enrollments with an empty student_profile_id", async () => {
    vi.mocked(
      studentProfileRepository.listStudentProfileDetailsByUserIds
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const rows = await loadClassStudentRows(adminClient, classId, {
      includeRemoveEligibility: false,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: enrollmentId,
      user_id: userId,
      student_profile_id: "",
      full_name: "Unknown student",
      email: "student@school.com",
      can_remove_student: true,
      has_pending_drop: false,
      has_semester_spp_payments: false,
    });
  });

  it("skips class/drop/SPP queries when includeRemoveEligibility is false", async () => {
    vi.mocked(
      studentProfileRepository.listStudentProfileDetailsByUserIds
    ).mockResolvedValue({
      data: [
        {
          id: "profile-1",
          user_id: userId,
          full_name: "Sara Ahmed",
          phone: null,
          status: "active",
          birth_date: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);

    await loadClassStudentRows(adminClient, classId, {
      includeRemoveEligibility: false,
    });

    expect(classRepository.findClassById).not.toHaveBeenCalled();
    expect(
      semesterDropRequestRepository.listPendingDropsBySemesterId
    ).not.toHaveBeenCalled();
    expect(
      semesterDropRequestRepository.listPendingDropsByStudentIds
    ).not.toHaveBeenCalled();
    expect(
      paymentPhaseRepository.findCurrentSyncPhaseBySemesterId
    ).not.toHaveBeenCalled();
    expect(
      studentPaymentPhaseRepository.listSppsByPhaseAndStudentIds
    ).not.toHaveBeenCalled();
    expect(
      studentPaymentRepository.listPaymentSppIdsBySppIds
    ).not.toHaveBeenCalled();
  });

  it("loads remove-eligibility flags when includeRemoveEligibility is true", async () => {
    vi.mocked(
      studentProfileRepository.listStudentProfileDetailsByUserIds
    ).mockResolvedValue({
      data: [
        {
          id: "profile-1",
          user_id: userId,
          full_name: "Sara Ahmed",
          phone: null,
          status: "active",
          birth_date: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);
    vi.mocked(classRepository.findClassById).mockResolvedValue({
      data: { id: classId, semester_id: semesterId },
      error: null,
    } as never);
    vi.mocked(
      semesterDropRequestRepository.listPendingDropsBySemesterId
    ).mockResolvedValue({ data: [], error: null } as never);
    vi.mocked(
      paymentPhaseRepository.findCurrentSyncPhaseBySemesterId
    ).mockResolvedValue({ data: null, error: null } as never);

    const rows = await loadClassStudentRows(adminClient, classId);

    expect(classRepository.findClassById).toHaveBeenCalledWith(
      adminClient,
      classId
    );
    expect(
      semesterDropRequestRepository.listPendingDropsBySemesterId
    ).toHaveBeenCalled();
    expect(rows[0]?.full_name).toBe("Sara Ahmed");
    expect(rows[0]?.can_remove_student).toBe(true);
  });

  it("uses preloaded semesterId and skips findClassById", async () => {
    vi.mocked(
      studentProfileRepository.listStudentProfileDetailsByUserIds
    ).mockResolvedValue({
      data: [
        {
          id: "profile-1",
          user_id: userId,
          full_name: "Sara Ahmed",
          phone: null,
          status: "active",
          birth_date: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);
    vi.mocked(
      semesterDropRequestRepository.listPendingDropsBySemesterId
    ).mockResolvedValue({ data: [], error: null } as never);
    vi.mocked(
      paymentPhaseRepository.findCurrentSyncPhaseBySemesterId
    ).mockResolvedValue({ data: null, error: null } as never);

    await loadClassStudentRows(adminClient, classId, {
      semesterId,
    });

    expect(classRepository.findClassById).not.toHaveBeenCalled();
    expect(
      semesterDropRequestRepository.listPendingDropsBySemesterId
    ).toHaveBeenCalledWith(adminClient, semesterId);
  });

  it("skips Auth emails when includeAuthEmails is false", async () => {
    vi.mocked(
      studentProfileRepository.listStudentProfileDetailsByUserIds
    ).mockResolvedValue({
      data: [
        {
          id: "profile-1",
          user_id: userId,
          full_name: "Sara Ahmed",
          phone: null,
          status: "active",
          birth_date: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);

    const rows = await loadClassStudentRows(adminClient, classId, {
      includeAuthEmails: false,
      includeRemoveEligibility: false,
    });

    expect(authRepository.listAuthEmailsByIds).not.toHaveBeenCalled();
    expect(rows[0]?.email).toBe("");
  });
});
