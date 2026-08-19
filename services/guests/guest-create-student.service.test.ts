import { describe, expect, it, vi, beforeEach } from "vitest";
import { DEFAULT_CREATED_STUDENT_PASSWORD } from "@/lib/constants/auth-limits";
import * as guestRepository from "@/repositories/guest.repository";
import * as registrationRepository from "@/repositories/student-registration-application.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import { createStudentFromGuestRegistrationForManager } from "@/services/guests/guest-create-student.service";
import * as guestService from "@/services/guests/guest.service";
import * as studentService from "@/services/students/student.service";
import type { CreateStudentFromGuestInput } from "@/lib/validators/manager/create-student-from-guest";
import type { ManagerStudentRow } from "@/types/manager-student";

vi.mock("@/repositories/guest.repository");
vi.mock("@/repositories/student-registration-application.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/guests/guest.service", () => ({
  applyGuestProfileStatusForGuestRecord: vi.fn(),
  recordGuestPipelineStatusesForGuest: vi.fn(),
}));
vi.mock("@/services/students/student.service", () => ({
  createStudent: vi.fn(),
}));
vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const guestId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const applicationId = "c3c4d5e6-f7a8-9012-cdef-123456789012";
const studentUserId = "d4d5e6f7-a8b9-0123-def0-234567890123";

const guestRecord = {
  id: guestId,
  full_name: "Ada Lovelace",
  phone: "+96171111111",
  age: 22,
  school_or_university: "AUB",
  education_level: "uni_year_3",
  interested_service: "etkan_roadmap",
  status: "pending",
  notes: null,
  created_by: actor.userId,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const applicationRecord = {
  id: applicationId,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  status: "pending",
  notes: null,
  full_name: "Ada Lovelace",
  gender: "female",
  date_of_birth: "2001-12-10",
  blood_type: "O+",
  email: "ada@example.com",
  phone: "+96171111111",
  additional_phone: null,
  city: "Beirut",
  full_address: "Hamra",
  education_level: "uni_year_3",
  organization_name: "AUB",
  speciality: null,
  learning_status: "enrolled",
  graduation_year: null,
  self_learning_notes: null,
  learning_goal: "Career",
  skills: ["python"],
  skills_other: null,
  referral_source: "friend",
  referral_other: null,
  preferred_program: "etkan_roadmap",
  available_days: ["monday"],
  preferred_shifts: ["morning"],
  weekly_available_hours: 10,
  job_status: "student",
  has_transportation: true,
  consent_terms: true,
  consent_privacy: true,
  guardian_name: null,
  guardian_phone: null,
  id_document_type: null,
  guest_id: guestId,
  user_id: null as string | null,
};

const student: ManagerStudentRow = {
  user_id: studentUserId,
  student_profile_id: "e5e6f7a8-b9c0-1234-ef01-345678901234",
  username: "ada_lovelace",
  email: "ada@example.com",
  full_name: "Ada Lovelace",
  birth_date: "2001-12-10",
  phone: "+96171111111",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
};

const input: CreateStudentFromGuestInput = {
  guest_id: guestId,
  username: "ada_lovelace",
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  password: DEFAULT_CREATED_STUDENT_PASSWORD,
  confirmPassword: DEFAULT_CREATED_STUDENT_PASSWORD,
  birthDate: "2001-12-10",
  phone: "+96171111111",
  markGuestAsFinished: true,
};

const okResult = {
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
};

function mockHappyPath(guestStatus = "pending") {
  vi.mocked(guestRepository.findGuestById).mockResolvedValue({
    data: { ...guestRecord, status: guestStatus },
    ...okResult,
  });
  vi.mocked(
    registrationRepository.findActiveApplicationByGuestId
  ).mockResolvedValue({
    data: applicationRecord,
    ...okResult,
  });
  vi.mocked(studentService.createStudent).mockResolvedValue({
    success: true,
    student,
    message: "Student account created.",
  });
  vi.mocked(registrationRepository.updateApplicationUserId).mockResolvedValue({
    data: { ...applicationRecord, user_id: studentUserId },
    ...okResult,
  });
  vi.mocked(guestService.applyGuestProfileStatusForGuestRecord).mockImplementation(
    async (_c, _a, guestRecord, profileInput) => ({
      success: true,
      guest: {
        ...guestRecord,
        status: profileInput.status,
      },
      message: "Guest status updated.",
    })
  );
  vi.mocked(guestService.recordGuestPipelineStatusesForGuest).mockResolvedValue({
    success: true,
    guest: { ...guestRecord, status: "pending" },
    message: "Statuses recorded.",
    statusEvents: [],
  });
}

describe("createStudentFromGuestRegistrationForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unauthorized actors", async () => {
    const result = await createStudentFromGuestRegistrationForManager(
      adminClient,
      null,
      actor,
      input
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(studentService.createStudent).not.toHaveBeenCalled();
  });

  it("rejects when there is no active application", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({ data: null, ...okResult });

    const result = await createStudentFromGuestRegistrationForManager(
      adminClient,
      actor.userId,
      actor,
      input
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/no registration application/i);
    }
    expect(studentService.createStudent).not.toHaveBeenCalled();
  });

  it("rejects when the application is already linked", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({
      data: { ...applicationRecord, user_id: studentUserId },
      ...okResult,
    });

    const result = await createStudentFromGuestRegistrationForManager(
      adminClient,
      actor.userId,
      actor,
      input
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already linked/i);
    }
    expect(studentService.createStudent).not.toHaveBeenCalled();
  });

  it("creates the student, links the application, records pipeline steps, and marks finished", async () => {
    mockHappyPath("pending");

    const result = await createStudentFromGuestRegistrationForManager(
      adminClient,
      actor.userId,
      actor,
      input
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.application.user_id).toBe(studentUserId);
      expect(result.student.user_id).toBe(studentUserId);
    }
    expect(studentService.createStudent).toHaveBeenCalledWith(
      adminClient,
      actor.userId,
      actor,
      expect.objectContaining({
        username: "ada_lovelace",
        password: DEFAULT_CREATED_STUDENT_PASSWORD,
      })
    );
    expect(registrationRepository.updateApplicationUserId).toHaveBeenCalledWith(
      adminClient,
      applicationId,
      studentUserId
    );
    expect(guestService.recordGuestPipelineStatusesForGuest).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({ id: guestId }),
      expect.objectContaining({
        statuses: ["routed_correctly", "finishing_routing_doc", "finished"],
        finishProfileOnPipelineFinished: false,
      })
    );
    expect(guestService.applyGuestProfileStatusForGuestRecord).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({ id: guestId }),
      expect.objectContaining({
        status: "finished",
      })
    );
  });

  it("does not mark the guest profile finished when the toggle is off", async () => {
    mockHappyPath("pending");

    const result = await createStudentFromGuestRegistrationForManager(
      adminClient,
      actor.userId,
      actor,
      { ...input, markGuestAsFinished: false }
    );

    expect(result.success).toBe(true);
    expect(guestService.recordGuestPipelineStatusesForGuest).toHaveBeenCalled();
    expect(guestService.applyGuestProfileStatusForGuestRecord).not.toHaveBeenCalled();
  });

  it("moves a scheduled guest to pending before recording pipeline steps", async () => {
    mockHappyPath("scheduled");

    const result = await createStudentFromGuestRegistrationForManager(
      adminClient,
      actor.userId,
      actor,
      input
    );

    expect(result.success).toBe(true);
    expect(guestService.applyGuestProfileStatusForGuestRecord).toHaveBeenNthCalledWith(
      1,
      adminClient,
      actor,
      expect.objectContaining({ id: guestId }),
      expect.objectContaining({
        status: "pending",
      })
    );
    expect(guestService.recordGuestPipelineStatusesForGuest).toHaveBeenCalled();
    expect(guestService.applyGuestProfileStatusForGuestRecord).toHaveBeenNthCalledWith(
      2,
      adminClient,
      actor,
      expect.any(Object),
      expect.objectContaining({
        status: "finished",
      })
    );
  });

  it("skips pipeline writes when the guest profile is cancelled", async () => {
    mockHappyPath("cancelled");

    const result = await createStudentFromGuestRegistrationForManager(
      adminClient,
      actor.userId,
      actor,
      input
    );

    expect(result.success).toBe(true);
    expect(guestService.recordGuestPipelineStatusesForGuest).not.toHaveBeenCalled();
    expect(guestService.applyGuestProfileStatusForGuestRecord).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.any(Object),
      expect.objectContaining({ status: "finished" })
    );
  });

  it("skips pipeline writes when the guest is already finished", async () => {
    mockHappyPath("finished");

    const result = await createStudentFromGuestRegistrationForManager(
      adminClient,
      actor.userId,
      actor,
      input
    );

    expect(result.success).toBe(true);
    expect(guestService.recordGuestPipelineStatusesForGuest).not.toHaveBeenCalled();
    expect(guestService.applyGuestProfileStatusForGuestRecord).not.toHaveBeenCalled();
  });
});
