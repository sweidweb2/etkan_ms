import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import * as rateLimit from "@/lib/rate-limit/public-registration-rate-limit";
import * as registrationRepository from "@/repositories/student-registration-application.repository";
import * as documentRepository from "@/repositories/student-registration-document.repository";
import * as registrationStorage from "@/repositories/registration-storage.repository";
import * as authorizationService from "@/services/authorization.service";
import {
  getRegistrationApplicationDetailForManager,
  listRegistrationApplicationsForManager,
  submitPublicRegistrationApplication,
  tempUploadRegistrationDocument,
  updateRegistrationApplicationForManager,
  updateRegistrationApplicationStatusForManager,
} from "@/services/student-registration.service";

vi.mock("@/repositories/student-registration-application.repository");
vi.mock("@/repositories/student-registration-document.repository");
vi.mock("@/repositories/registration-storage.repository");
vi.mock("@/lib/rate-limit/public-registration-rate-limit", () => ({
  checkPublicRegistrationSubmitRateLimit: vi.fn(async () => ({
    allowed: true as const,
  })),
  checkPublicRegistrationUploadRateLimit: vi.fn(async () => ({
    allowed: true as const,
  })),
}));
vi.mock("@/services/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
  hasPermission: vi.fn(async (_c, userId) => Boolean(userId)),
}));

const adminClient = {} as never;
const actorUserId = "11111111-1111-4111-8111-111111111111";
const uploadSessionId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const applicationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const validDoc = {
  storage_path: `registration/tmp/${uploadSessionId}/dddddddd-dddd-4ddd-8ddd-dddddddddddd-id.pdf`,
  file_name: "id.pdf",
  mime_type: "application/pdf" as const,
  file_size: 1024,
};

const validInput = {
  full_name: "Ada Lovelace",
  gender: "female" as const,
  date_of_birth: "2000-01-15",
  blood_type: "O+" as const,
  email: "ada@example.com",
  phone: "+96171123456",
  additional_phone: null,
  city: "Beirut",
  full_address: "Hamra Street 12",
  education_level: "uni_year_2" as const,
  organization_name: null,
  speciality: null,
  learning_status: "learning" as const,
  graduation_year: null,
  self_learning_notes: null,
  learning_goal: "Build real products with a team",
  skills: ["web_dev" as const],
  referral_source: "friend" as const,
  referral_other: null,
  skills_other: null,
  preferred_program: "general" as const,
  available_days: ["sat" as const],
  preferred_shifts: ["morning" as const],
  weekly_available_hours: 8,
  job_status: "student_only" as const,
  has_transportation: true,
  id_document_type: "national_id" as const,
  upload_session_id: uploadSessionId,
  documents: [validDoc],
  consent_terms: true as const,
  consent_privacy: true as const,
  guardian_name: null,
  guardian_phone: null,
};

const applicationRecord = {
  id: applicationId,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
  status: "accepted",
  notes: "Looks good",
  full_name: "Ada Lovelace",
  gender: "female",
  date_of_birth: "2000-01-15",
  blood_type: "O+",
  email: "ada@example.com",
  phone: "+96171123456",
  additional_phone: null,
  city: "Beirut",
  full_address: "Hamra Street 12",
  education_level: "uni_year_2",
  organization_name: null,
  speciality: null,
  learning_status: "learning",
  graduation_year: null,
  self_learning_notes: null,
  learning_goal: "Build real products",
  skills: ["web_dev"],
  referral_source: "friend",
  referral_other: null,
  skills_other: null,
  preferred_program: "general",
  available_days: ["sat"],
  preferred_shifts: ["morning"],
  weekly_available_hours: 8,
  job_status: "student_only",
  has_transportation: true,
  id_document_type: "national_id",
  consent_terms: true,
  consent_privacy: true,
  guardian_name: null,
  guardian_phone: null,
  guest_id: null,
  user_id: null,
};

describe("student-registration.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a temp registration document", async () => {
    vi.mocked(
      registrationStorage.uploadRegistrationStorageObject
    ).mockResolvedValue({ error: null });

    const file = new File(["hello"], "id.pdf", { type: "application/pdf" });
    const result = await tempUploadRegistrationDocument(adminClient, {
      upload_session_id: uploadSessionId,
      file,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.document.file_name).toBe("id.pdf");
      expect(result.document.storage_path).toContain(
        `registration/tmp/${uploadSessionId}/`
      );
    }
    expect(
      registrationStorage.uploadRegistrationStorageObject
    ).toHaveBeenCalledOnce();
  });

  it("skips the public upload rate limit when requested", async () => {
    vi.mocked(
      registrationStorage.uploadRegistrationStorageObject
    ).mockResolvedValue({ error: null });

    const file = new File(["hello"], "id.pdf", { type: "application/pdf" });
    const result = await tempUploadRegistrationDocument(
      adminClient,
      {
        upload_session_id: uploadSessionId,
        file,
      },
      { skipRateLimit: true }
    );

    expect(result.success).toBe(true);
    expect(rateLimit.checkPublicRegistrationUploadRateLimit).not.toHaveBeenCalled();
  });

  it("creates a public registration application and finalizes documents", async () => {
    vi.mocked(
      registrationRepository.createStudentRegistrationApplication
    ).mockResolvedValue({
      data: { id: applicationId },
      error: null,
    } as never);
    vi.mocked(
      registrationStorage.moveRegistrationStorageObject
    ).mockResolvedValue({ error: null });
    vi.mocked(
      documentRepository.createStudentRegistrationDocuments
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await submitPublicRegistrationApplication(
      adminClient,
      validInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(applicationId);
    }
    expect(
      registrationRepository.createStudentRegistrationApplication
    ).toHaveBeenCalledOnce();
    expect(
      registrationRepository.createStudentRegistrationApplication
    ).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({ guest_id: null })
    );
    expect(
      registrationStorage.moveRegistrationStorageObject
    ).toHaveBeenCalledOnce();
    expect(
      documentRepository.createStudentRegistrationDocuments
    ).toHaveBeenCalledOnce();
  });

  it("rolls back application when document move fails", async () => {
    vi.mocked(
      registrationRepository.createStudentRegistrationApplication
    ).mockResolvedValue({
      data: { id: applicationId },
      error: null,
    } as never);
    vi.mocked(
      registrationStorage.moveRegistrationStorageObject
    ).mockResolvedValue({ error: { message: "move failed" } });
    vi.mocked(
      registrationRepository.deleteStudentRegistrationApplicationById
    ).mockResolvedValue({ error: null } as never);

    const result = await submitPublicRegistrationApplication(
      adminClient,
      validInput
    );

    expect(result.success).toBe(false);
    expect(
      registrationRepository.deleteStudentRegistrationApplicationById
    ).toHaveBeenCalledWith(adminClient, applicationId);
  });

  it("lists applications for authorized managers", async () => {
    vi.mocked(
      registrationRepository.listStudentRegistrationApplicationsForList
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const rows = await listRegistrationApplicationsForManager(
      adminClient,
      actorUserId
    );

    expect(rows).toEqual([]);
    expect(authorizationService.assertPermission).toHaveBeenCalledWith(
      adminClient,
      actorUserId,
      PERMISSIONS.REGISTRATIONS_VIEW
    );
    expect(
      documentRepository.listStudentRegistrationDocumentsByApplicationIds
    ).not.toHaveBeenCalled();
  });

  it("returns application detail with signed document urls", async () => {
    vi.mocked(
      registrationRepository.findStudentRegistrationApplicationById
    ).mockResolvedValue({
      data: applicationRecord,
      error: null,
    } as never);
    vi.mocked(
      documentRepository.listStudentRegistrationDocumentsByApplicationId
    ).mockResolvedValue({
      data: [
        {
          id: "doc-1",
          application_id: applicationId,
          storage_path: `registration/${applicationId}/file.pdf`,
          file_name: "file.pdf",
          mime_type: "application/pdf",
          file_size: 100,
          sort_order: 0,
          created_at: "2026-08-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);
    vi.mocked(
      registrationStorage.createRegistrationDocumentSignedUrl
    ).mockResolvedValue({
      data: { signedUrl: "https://example.com/signed.pdf" },
      error: null,
    });

    const detail = await getRegistrationApplicationDetailForManager(
      adminClient,
      actorUserId,
      applicationId
    );

    expect(detail?.application.id).toBe(applicationId);
    expect(detail?.signedDocuments).toEqual([
      {
        id: "doc-1",
        file_name: "file.pdf",
        mime_type: "application/pdf",
        file_size: 100,
        signedUrl: "https://example.com/signed.pdf",
      },
    ]);
  });

  it("rejects unauthorized detail access", async () => {
    await expect(
      getRegistrationApplicationDetailForManager(
        adminClient,
        null,
        applicationId
      )
    ).rejects.toThrow("Unauthorized.");
  });

  it("rejects unauthorized status updates", async () => {
    await expect(
      updateRegistrationApplicationStatusForManager(adminClient, null, {
        id: applicationId,
        status: "accepted",
      })
    ).rejects.toThrow("Unauthorized.");
  });

  it("updates status and notes for authorized managers", async () => {
    vi.mocked(
      registrationRepository.findStudentRegistrationApplicationById
    ).mockResolvedValue({
      data: { id: applicationId },
      error: null,
    } as never);
    vi.mocked(
      registrationRepository.updateStudentRegistrationApplicationStatus
    ).mockResolvedValue({
      data: { ...applicationRecord, status: "missing", notes: "Need ID" },
      error: null,
    } as never);
    vi.mocked(
      documentRepository.listStudentRegistrationDocumentsByApplicationId
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await updateRegistrationApplicationStatusForManager(
      adminClient,
      actorUserId,
      {
        id: applicationId,
        status: "missing",
        notes: "Need ID",
      }
    );

    expect(result.success).toBe(true);
    expect(
      registrationRepository.updateStudentRegistrationApplicationStatus
    ).toHaveBeenCalledWith(adminClient, applicationId, "missing", "Need ID");
    expect(authorizationService.assertPermission).toHaveBeenCalledWith(
      adminClient,
      actorUserId,
      PERMISSIONS.REGISTRATIONS_UPDATE_STATUS
    );
  });

  it("updates full application fields for authorized managers", async () => {
    vi.mocked(
      registrationRepository.findStudentRegistrationApplicationById
    ).mockResolvedValue({
      data: { id: applicationId },
      error: null,
    } as never);
    vi.mocked(
      registrationRepository.updateStudentRegistrationApplication
    ).mockResolvedValue({
      data: { ...applicationRecord, full_name: "Ada Updated" },
      error: null,
    } as never);
    vi.mocked(
      documentRepository.listStudentRegistrationDocumentsByApplicationId
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await updateRegistrationApplicationForManager(
      adminClient,
      actorUserId,
      {
        id: applicationId,
        status: "accepted",
        notes: null,
        full_name: "Ada Updated",
        gender: "female",
        date_of_birth: "2000-01-15",
        blood_type: "O+",
        email: "ada@example.com",
        phone: "+96171123456",
        additional_phone: null,
        city: "Beirut",
        full_address: "Hamra Street 12",
        education_level: "uni_year_2",
        organization_name: null,
        speciality: null,
        learning_status: "learning",
        graduation_year: null,
        self_learning_notes: null,
        learning_goal: "Build real products",
        skills: ["web_dev"],
        referral_source: "friend",
        referral_other: null,
        skills_other: null,
        preferred_program: "general",
        available_days: ["sat"],
        preferred_shifts: ["morning"],
        weekly_available_hours: 8,
        job_status: "student_only",
        has_transportation: true,
        id_document_type: "national_id",
        guardian_name: null,
        guardian_phone: null,
      }
    );

    expect(result.success).toBe(true);
    expect(
      registrationRepository.updateStudentRegistrationApplication
    ).toHaveBeenCalledOnce();
  });
});
