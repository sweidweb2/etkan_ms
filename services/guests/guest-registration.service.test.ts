import { describe, expect, it, vi, beforeEach } from "vitest";
import * as guestRepository from "@/repositories/guest.repository";
import * as inviteRepository from "@/repositories/guest-registration-invite.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as registrationRepository from "@/repositories/student-registration-application.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  cancelGuestRegistrationApplicationForManager,
  connectGuestRegistrationUserForManager,
  deleteGuestRegistrationApplicationForManager,
  getGuestRegistrationContextByToken,
  openGuestRegistrationInviteForManager,
  removeTempGuestRegistrationDocumentForManager,
  stopGuestRegistrationInviteForManager,
  submitGuestRegistrationByToken,
  submitGuestRegistrationForManager,
  tempUploadGuestRegistrationDocumentForManager,
} from "@/services/guests/guest-registration.service";
import * as studentRegistrationService from "@/services/students/student-registration.service";
import type { SubmitPublicRegistrationInput } from "@/lib/validators/public/registration";
import * as documentRepository from "@/repositories/student-registration-document.repository";
import * as registrationStorage from "@/repositories/registration-storage.repository";

vi.mock("@/repositories/guest.repository");
vi.mock("@/repositories/guest-registration-invite.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/student-registration-application.repository");
vi.mock("@/repositories/student-registration-document.repository");
vi.mock("@/repositories/registration-storage.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/students/student-registration.service", () => ({
  submitPublicRegistrationApplication: vi.fn(),
  tempUploadRegistrationDocument: vi.fn(),
  removeTempRegistrationDocument: vi.fn(),
}));
vi.mock("@/lib/manager/guests/guest-registration-invite-url", () => ({
  getGuestRegistrationInviteUrl: (token: string) =>
    `https://example.com/register/guest/${token}`,
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
const inviteId = "b2b3c4d5-e6f7-8901-bcde-f12345678901";

const guestRecord = {
  id: guestId,
  full_name: "Ada Lovelace",
  phone: "+96171111111",
  age: 22,
  school_or_university: "AUB",
  education_level: "uni_year_3",
  interested_service: "etkan_roadmap",
  status: "scheduled",
  notes: null,
  created_by: actor.userId,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const activeInvite = {
  id: inviteId,
  guest_id: guestId,
  token: "token-abc",
  application_id: null,
  created_by: actor.userId,
  created_at: "2026-01-01T00:00:00.000Z",
  used_at: null,
  cancelled_at: null,
};

const okResult = {
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
};

const sampleInput = {
  full_name: "Ada Lovelace",
} as SubmitPublicRegistrationInput;

describe("openGuestRegistrationInviteForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unauthorized actors", async () => {
    const result = await openGuestRegistrationInviteForManager(
      adminClient,
      null,
      actor,
      guestId
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("creates invite when none exists", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({ data: null, ...okResult });
    vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
      data: null,
      ...okResult,
    });
    vi.mocked(inviteRepository.createInvite).mockResolvedValue({
      data: activeInvite,
      ...okResult,
    });

    const result = await openGuestRegistrationInviteForManager(
      adminClient,
      actor.userId,
      actor,
      guestId
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.invite.guest_id).toBe(guestId);
      expect(result.invite.public_url).toContain("/register/guest/");
    }
    expect(inviteRepository.createInvite).toHaveBeenCalled();
  });

    it("rotates token when staff generates a new link", async () => {
      vi.mocked(guestRepository.findGuestById).mockResolvedValue({
        data: guestRecord,
        ...okResult,
      });
      vi.mocked(
        registrationRepository.findActiveApplicationByGuestId
      ).mockResolvedValue({ data: null, ...okResult });
      vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
        data: activeInvite,
        ...okResult,
      });
      vi.mocked(inviteRepository.updateInvite).mockResolvedValue({
        data: { ...activeInvite, token: "rotated-token" },
        ...okResult,
      });

      const result = await openGuestRegistrationInviteForManager(
        adminClient,
        actor.userId,
        actor,
        guestId,
        { rotate: true }
      );

      expect(result.success).toBe(true);
      expect(inviteRepository.updateInvite).toHaveBeenCalled();
      if (result.success) {
        expect(result.message).toMatch(/new registration invite link/i);
        expect(result.invite.token).toBe("rotated-token");
      }
    });

  it("returns existing active unused invite idempotently", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({ data: null, ...okResult });
    vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
      data: activeInvite,
      ...okResult,
    });

    const result = await openGuestRegistrationInviteForManager(
      adminClient,
      actor.userId,
      actor,
      guestId
    );

    expect(result.success).toBe(true);
    expect(inviteRepository.createInvite).not.toHaveBeenCalled();
    expect(inviteRepository.updateInvite).not.toHaveBeenCalled();
  });

  it("resets stopped invite when no active application", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({ data: null, ...okResult });
    vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
      data: { ...activeInvite, cancelled_at: "2026-01-02T00:00:00.000Z" },
      ...okResult,
    });
    vi.mocked(inviteRepository.updateInvite).mockResolvedValue({
      data: activeInvite,
      ...okResult,
    });

    const result = await openGuestRegistrationInviteForManager(
      adminClient,
      actor.userId,
      actor,
      guestId
    );

    expect(result.success).toBe(true);
    expect(inviteRepository.updateInvite).toHaveBeenCalled();
  });

  it("errors when an active application exists", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({
      data: {
        id: "app-1",
        status: "pending",
        created_at: "2026-01-01T00:00:00.000Z",
        user_id: null,
        full_name: guestRecord.full_name,
        email: "ada@example.com",
        phone: guestRecord.phone,
        date_of_birth: "2004-01-01",
      } as never,
      ...okResult,
    });

    const result = await openGuestRegistrationInviteForManager(
      adminClient,
      actor.userId,
      actor,
      guestId
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already has an active registration/i);
    }
  });
});

describe("stopGuestRegistrationInviteForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unauthorized actors", async () => {
    const result = await stopGuestRegistrationInviteForManager(
      adminClient,
      null,
      actor,
      guestId
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("stops an active invite", async () => {
    vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
      data: activeInvite,
      ...okResult,
    });
    vi.mocked(inviteRepository.stopInvite).mockResolvedValue({
      data: {
        ...activeInvite,
        cancelled_at: "2026-01-03T00:00:00.000Z",
      },
      ...okResult,
    });

    const result = await stopGuestRegistrationInviteForManager(
      adminClient,
      actor.userId,
      actor,
      guestId
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.invite.cancelled_at).not.toBeNull();
    }
  });
});

describe("submitGuestRegistrationByToken", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("marks invite used after successful submit", async () => {
    vi.mocked(inviteRepository.findInviteByToken).mockResolvedValue({
      data: activeInvite,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({ data: null, ...okResult });
    vi.mocked(
      studentRegistrationService.submitPublicRegistrationApplication
    ).mockResolvedValue({
      success: true,
      id: "app-1",
      message: "ok",
    });
    vi.mocked(inviteRepository.markInviteUsed).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-04T00:00:00.000Z",
        application_id: "app-1",
      },
      ...okResult,
    });

    const result = await submitGuestRegistrationByToken(
      adminClient,
      "token-abc",
      sampleInput
    );

    expect(result.success).toBe(true);
    expect(inviteRepository.markInviteUsed).toHaveBeenCalledWith(
      adminClient,
      inviteId,
      "app-1",
      expect.any(String)
    );
  });

  it("deletes orphan application when mark-used loses the race", async () => {
    vi.mocked(inviteRepository.findInviteByToken).mockResolvedValue({
      data: activeInvite,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({ data: null, ...okResult });
    vi.mocked(
      studentRegistrationService.submitPublicRegistrationApplication
    ).mockResolvedValue({
      success: true,
      id: "app-orphan",
      message: "ok",
    });
    vi.mocked(inviteRepository.markInviteUsed).mockResolvedValue({
      data: null,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.deleteStudentRegistrationApplicationById
    ).mockResolvedValue({ data: null, ...okResult });

    const result = await submitGuestRegistrationByToken(
      adminClient,
      "token-abc",
      sampleInput
    );

    expect(result.success).toBe(false);
    expect(
      registrationRepository.deleteStudentRegistrationApplicationById
    ).toHaveBeenCalledWith(adminClient, "app-orphan");
  });

  it("rejects submit when invite already used", async () => {
    vi.mocked(inviteRepository.findInviteByToken).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-04T00:00:00.000Z",
        application_id: "app-1",
      },
      ...okResult,
    });

    const result = await submitGuestRegistrationByToken(
      adminClient,
      "token-abc",
      sampleInput
    );

    expect(result.success).toBe(false);
    expect(
      studentRegistrationService.submitPublicRegistrationApplication
    ).not.toHaveBeenCalled();
  });
});

describe("submitGuestRegistrationForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unauthorized actors", async () => {
    const result = await submitGuestRegistrationForManager(
      adminClient,
      null,
      actor,
      guestId,
      sampleInput
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("submits dossier and marks invite used", async () => {
    vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
      data: activeInvite,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({ data: null, ...okResult });
    vi.mocked(
      studentRegistrationService.submitPublicRegistrationApplication
    ).mockResolvedValue({
      success: true,
      id: "app-staff",
      message: "ok",
    });
    vi.mocked(inviteRepository.markInviteUsed).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-05T00:00:00.000Z",
        application_id: "app-staff",
      },
      ...okResult,
    });

    const result = await submitGuestRegistrationForManager(
      adminClient,
      actor.userId,
      actor,
      guestId,
      sampleInput
    );

    expect(result.success).toBe(true);
    expect(
      studentRegistrationService.submitPublicRegistrationApplication
    ).toHaveBeenCalledWith(
      adminClient,
      sampleInput,
      { guest_id: guestId, skipRateLimit: true }
    );
  });
});

describe("getGuestRegistrationContextByToken", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns stopped when invite cancelled_at is set", async () => {
    vi.mocked(inviteRepository.findInviteByToken).mockResolvedValue({
      data: {
        ...activeInvite,
        cancelled_at: "2026-01-03T00:00:00.000Z",
      },
      ...okResult,
    });

    const context = await getGuestRegistrationContextByToken(
      adminClient,
      "token-abc"
    );
    expect(context).toEqual({ status: "stopped" });
  });

  it("returns used when invite used_at is set", async () => {
    vi.mocked(inviteRepository.findInviteByToken).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-04T00:00:00.000Z",
        application_id: "app-1",
      },
      ...okResult,
    });

    const context = await getGuestRegistrationContextByToken(
      adminClient,
      "token-abc"
    );
    expect(context).toEqual({ status: "used" });
  });
});

describe("cancelGuestRegistrationApplicationForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("cancels application and stops invite", async () => {
    vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-04T00:00:00.000Z",
        application_id: "app-1",
      },
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({
      data: null,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findStudentRegistrationApplicationById
    ).mockResolvedValue({
      data: {
        id: "app-1",
        guest_id: guestId,
        status: "pending",
      } as never,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.updateStudentRegistrationApplicationStatus
    ).mockResolvedValue({
      data: { id: "app-1", status: "cancelled" } as never,
      ...okResult,
    });
    vi.mocked(inviteRepository.stopInvite).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-04T00:00:00.000Z",
        application_id: "app-1",
        cancelled_at: "2026-01-06T00:00:00.000Z",
      },
      ...okResult,
    });

    const result = await cancelGuestRegistrationApplicationForManager(
      adminClient,
      actor.userId,
      actor,
      guestId
    );

    expect(result.success).toBe(true);
    expect(
      registrationRepository.updateStudentRegistrationApplicationStatus
    ).toHaveBeenCalledWith(adminClient, "app-1", "cancelled");
    expect(inviteRepository.stopInvite).toHaveBeenCalled();
  });

  it("cancels the active application when invite application_id is null", async () => {
    vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-04T00:00:00.000Z",
        application_id: null,
      },
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({
      data: {
        id: "app-active",
        guest_id: guestId,
        status: "pending",
        created_at: "2026-01-04T00:00:00.000Z",
        user_id: null,
        full_name: guestRecord.full_name,
        email: "ada@example.com",
        phone: guestRecord.phone,
        date_of_birth: "2004-01-01",
      } as never,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findStudentRegistrationApplicationById
    ).mockResolvedValue({
      data: {
        id: "app-active",
        guest_id: guestId,
        status: "pending",
      } as never,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.updateStudentRegistrationApplicationStatus
    ).mockResolvedValue({
      data: { id: "app-active", status: "cancelled" } as never,
      ...okResult,
    });
    vi.mocked(inviteRepository.stopInvite).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-04T00:00:00.000Z",
        application_id: null,
        cancelled_at: "2026-01-06T00:00:00.000Z",
      },
      ...okResult,
    });

    const result = await cancelGuestRegistrationApplicationForManager(
      adminClient,
      actor.userId,
      actor,
      guestId
    );

    expect(result.success).toBe(true);
    expect(
      registrationRepository.updateStudentRegistrationApplicationStatus
    ).toHaveBeenCalledWith(adminClient, "app-active", "cancelled");
  });
});

describe("deleteGuestRegistrationApplicationForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("hard-deletes application, cleans storage, and clears invite application_id", async () => {
    vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-04T00:00:00.000Z",
        application_id: "app-1",
      },
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({
      data: null,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findStudentRegistrationApplicationById
    ).mockResolvedValue({
      data: {
        id: "app-1",
        guest_id: guestId,
        status: "pending",
      } as never,
      ...okResult,
    });
    vi.mocked(
      documentRepository.listStudentRegistrationDocumentsByApplicationId
    ).mockResolvedValue({
      data: [
        {
          id: "doc-1",
          application_id: "app-1",
          storage_path: "registrations/app-1/a.pdf",
          file_name: "a.pdf",
          mime_type: "application/pdf",
          file_size: 10,
          sort_order: 0,
          created_at: "2026-01-04T00:00:00.000Z",
        },
      ],
      ...okResult,
    });
    vi.mocked(
      registrationStorage.removeRegistrationStorageObjects
    ).mockResolvedValue({ error: null } as never);
    vi.mocked(
      registrationRepository.deleteStudentRegistrationApplicationById
    ).mockResolvedValue({ data: null, ...okResult });
    vi.mocked(inviteRepository.clearInviteApplicationId).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-04T00:00:00.000Z",
        application_id: null,
      },
      ...okResult,
    });

    const result = await deleteGuestRegistrationApplicationForManager(
      adminClient,
      actor.userId,
      actor,
      guestId
    );

    expect(result.success).toBe(true);
    expect(
      registrationStorage.removeRegistrationStorageObjects
    ).toHaveBeenCalledWith(adminClient, ["registrations/app-1/a.pdf"]);
    expect(
      registrationRepository.deleteStudentRegistrationApplicationById
    ).toHaveBeenCalledWith(adminClient, "app-1");
    expect(inviteRepository.clearInviteApplicationId).toHaveBeenCalledWith(
      adminClient,
      inviteId
    );
  });

  it("fails closed when storage cleanup errors and does not delete the application", async () => {
    vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-04T00:00:00.000Z",
        application_id: "app-1",
      },
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({
      data: null,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findStudentRegistrationApplicationById
    ).mockResolvedValue({
      data: {
        id: "app-1",
        guest_id: guestId,
        status: "pending",
      } as never,
      ...okResult,
    });
    vi.mocked(
      documentRepository.listStudentRegistrationDocumentsByApplicationId
    ).mockResolvedValue({
      data: [
        {
          id: "doc-1",
          application_id: "app-1",
          storage_path: "registrations/app-1/a.pdf",
          file_name: "a.pdf",
          mime_type: "application/pdf",
          file_size: 10,
          sort_order: 0,
          created_at: "2026-01-04T00:00:00.000Z",
        },
      ],
      ...okResult,
    });
    vi.mocked(
      registrationStorage.removeRegistrationStorageObjects
    ).mockResolvedValue({
      error: { message: "storage unavailable" },
    } as never);

    const result = await deleteGuestRegistrationApplicationForManager(
      adminClient,
      actor.userId,
      actor,
      guestId
    );

    expect(result).toEqual({
      success: false,
      error: "storage unavailable",
    });
    expect(
      registrationRepository.deleteStudentRegistrationApplicationById
    ).not.toHaveBeenCalled();
    expect(inviteRepository.clearInviteApplicationId).not.toHaveBeenCalled();
  });

  it("allows reopen after hard-delete when no active application remains", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({ data: null, ...okResult });
    vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
      data: {
        ...activeInvite,
        used_at: "2026-01-04T00:00:00.000Z",
        application_id: null,
      },
      ...okResult,
    });
    vi.mocked(inviteRepository.updateInvite).mockResolvedValue({
      data: activeInvite,
      ...okResult,
    });

    const result = await openGuestRegistrationInviteForManager(
      adminClient,
      actor.userId,
      actor,
      guestId
    );

    expect(result.success).toBe(true);
    expect(inviteRepository.updateInvite).toHaveBeenCalled();
  });
});

const applicationId = "c3c4d5e6-f7a8-9012-cdef-123456789012";
const linkedUserId = "22222222-2222-4222-8222-222222222222";
const otherUserId = "33333333-3333-4333-8333-333333333333";

const applicationSummaryRecord = {
  id: applicationId,
  status: "pending",
  created_at: "2026-01-01T00:00:00.000Z",
  user_id: null as string | null,
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+96171111111",
  date_of_birth: "2001-12-10",
};

const linkedProfile = {
  id: linkedUserId,
  username: "ada",
  role: "student",
  is_instructor: false,
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("connectGuestRegistrationUserForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("connects a user while the guest is still pending", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: { ...guestRecord, status: "pending" },
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({
      data: applicationSummaryRecord as never,
      ...okResult,
    });
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: linkedProfile,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByUserId
    ).mockResolvedValue({ data: null, ...okResult });
    vi.mocked(registrationRepository.updateApplicationUserId).mockResolvedValue({
      data: { ...applicationSummaryRecord, user_id: linkedUserId } as never,
      ...okResult,
    });

    const result = await connectGuestRegistrationUserForManager(
      adminClient,
      actor.userId,
      actor,
      { guest_id: guestId, user_id: linkedUserId }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.application.user_id).toBe(linkedUserId);
    }
    expect(registrationRepository.updateApplicationUserId).toHaveBeenCalled();
  });

  it("denies when there is no active application", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: { ...guestRecord, status: "finished" },
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({ data: null, ...okResult });

    const result = await connectGuestRegistrationUserForManager(
      adminClient,
      actor.userId,
      actor,
      { guest_id: guestId, user_id: linkedUserId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/no registration application/i);
    }
  });

  it("sets user_id on the guest application", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: { ...guestRecord, status: "finished" },
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({
      data: applicationSummaryRecord as never,
      ...okResult,
    });
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: linkedProfile,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByUserId
    ).mockResolvedValue({ data: null, ...okResult });
    vi.mocked(registrationRepository.updateApplicationUserId).mockResolvedValue({
      data: { ...applicationSummaryRecord, user_id: linkedUserId } as never,
      ...okResult,
    });

    const result = await connectGuestRegistrationUserForManager(
      adminClient,
      actor.userId,
      actor,
      { guest_id: guestId, user_id: linkedUserId }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.application.user_id).toBe(linkedUserId);
    }
    expect(registrationRepository.updateApplicationUserId).toHaveBeenCalledWith(
      adminClient,
      applicationId,
      linkedUserId
    );
  });

  it("rejects a user already linked to another application", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: { ...guestRecord, status: "finished" },
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({
      data: applicationSummaryRecord as never,
      ...okResult,
    });
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: linkedProfile,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByUserId
    ).mockResolvedValue({
      data: { id: "other-app", user_id: linkedUserId } as never,
      ...okResult,
    });

    const result = await connectGuestRegistrationUserForManager(
      adminClient,
      actor.userId,
      actor,
      { guest_id: guestId, user_id: linkedUserId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already linked/i);
    }
    expect(
      registrationRepository.updateApplicationUserId
    ).not.toHaveBeenCalled();
  });

  it("allows reconnecting the same application to a different user", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: { ...guestRecord, status: "finished" },
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByGuestId
    ).mockResolvedValue({
      data: { ...applicationSummaryRecord, user_id: otherUserId } as never,
      ...okResult,
    });
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: linkedProfile,
      ...okResult,
    });
    vi.mocked(
      registrationRepository.findActiveApplicationByUserId
    ).mockResolvedValue({ data: null, ...okResult });
    vi.mocked(registrationRepository.updateApplicationUserId).mockResolvedValue({
      data: { ...applicationSummaryRecord, user_id: linkedUserId } as never,
      ...okResult,
    });

    const result = await connectGuestRegistrationUserForManager(
      adminClient,
      actor.userId,
      actor,
      { guest_id: guestId, user_id: linkedUserId }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.application.user_id).toBe(linkedUserId);
      expect(result.message).toMatch(/updated/i);
    }
    expect(registrationRepository.updateApplicationUserId).toHaveBeenCalled();
  });
});

describe("tempUploadGuestRegistrationDocumentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unauthorized actors", async () => {
    const file = new File(["id"], "id.pdf", { type: "application/pdf" });
    const result = await tempUploadGuestRegistrationDocumentForManager(
      adminClient,
      null,
      { upload_session_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", file }
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(
      studentRegistrationService.tempUploadRegistrationDocument
    ).not.toHaveBeenCalled();
  });

  it("uploads with the public rate limit skipped", async () => {
    const file = new File(["id"], "id.pdf", { type: "application/pdf" });
    vi.mocked(
      studentRegistrationService.tempUploadRegistrationDocument
    ).mockResolvedValue({
      success: true,
      message: "Document uploaded.",
      document: {
        storage_path: "registration/tmp/session/file.pdf",
        file_name: "id.pdf",
        mime_type: "application/pdf",
        file_size: 2,
      },
    });

    const result = await tempUploadGuestRegistrationDocumentForManager(
      adminClient,
      actor.userId,
      { upload_session_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", file }
    );

    expect(result.success).toBe(true);
    expect(
      studentRegistrationService.tempUploadRegistrationDocument
    ).toHaveBeenCalledWith(
      adminClient,
      { upload_session_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", file },
      { skipRateLimit: true }
    );
  });
});

describe("removeTempGuestRegistrationDocumentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unauthorized actors", async () => {
    const result = await removeTempGuestRegistrationDocumentForManager(
      adminClient,
      null,
      {
        upload_session_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        storage_path: "registration/tmp/session/file.pdf",
      }
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(
      studentRegistrationService.removeTempRegistrationDocument
    ).not.toHaveBeenCalled();
  });
});
