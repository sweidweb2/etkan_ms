import { PERMISSIONS } from "@/lib/constants/permissions";
import type {
  RegistrationApplicationStatus,
  RegistrationBloodType,
  RegistrationEducationLevel,
  RegistrationGender,
  RegistrationIdDocumentType,
  RegistrationJobStatus,
  RegistrationLearningStatus,
  RegistrationPreferredProgram,
  RegistrationReferralSource,
  RegistrationShift,
  RegistrationSkill,
  RegistrationWeekday,
} from "@/lib/constants/public-registration";
import {
  buildRegistrationDocumentStoragePath,
  buildRegistrationTempStoragePath,
  isRegistrationTempStoragePath,
} from "@/lib/public/registration/storage-path";
import {
  checkPublicRegistrationSubmitRateLimit,
  checkPublicRegistrationUploadRateLimit,
} from "@/lib/rate-limit/public-registration-rate-limit";
import type {
  RemoveTempRegistrationDocumentInput,
  SubmitPublicRegistrationInput,
  TempUploadRegistrationDocumentInput,
  UpdateManagerRegistrationInput,
  UpdateRegistrationStatusInput,
} from "@/lib/validators/public/registration";
import * as registrationRepository from "@/repositories/student-registration-application.repository";
import type { StudentRegistrationApplicationRecord } from "@/repositories/student-registration-application.repository";
import * as documentRepository from "@/repositories/student-registration-document.repository";
import * as registrationStorage from "@/repositories/registration-storage.repository";
import { assertPermission } from "@/services/auth/authorization.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerRegistrationApplicationRow,
  ManagerRegistrationDocumentRow,
  ManagerRegistrationDocumentSignedRow,
} from "@/types/public-registration";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const REGISTRATION_DOCUMENT_MOVE_CONCURRENCY = 5;
const REGISTRATION_SIGNED_URL_CONCURRENCY = 5;

async function createSignedUrlsForDocuments(
  adminClient: Supabase,
  documentRecords: documentRepository.StudentRegistrationDocumentRecord[]
): Promise<ManagerRegistrationDocumentSignedRow[]> {
  if (documentRecords.length === 0) {
    return [];
  }

  const signedDocuments: ManagerRegistrationDocumentSignedRow[] = [];

  for (
    let index = 0;
    index < documentRecords.length;
    index += REGISTRATION_SIGNED_URL_CONCURRENCY
  ) {
    const chunk = documentRecords.slice(
      index,
      index + REGISTRATION_SIGNED_URL_CONCURRENCY
    );
    const signedChunk = await Promise.all(
      chunk.map(async (doc) => {
        const signed =
          await registrationStorage.createRegistrationDocumentSignedUrl(
            adminClient,
            doc.storage_path
          );

        if (signed.error || !signed.data) {
          throw new Error(
            signed.error?.message ?? "Unable to create download link."
          );
        }

        return {
          id: doc.id,
          file_name: doc.file_name,
          mime_type: doc.mime_type,
          file_size: doc.file_size,
          signedUrl: signed.data.signedUrl,
        };
      })
    );
    signedDocuments.push(...signedChunk);
  }

  return signedDocuments;
}

function mapDocumentRecord(
  record: documentRepository.StudentRegistrationDocumentRecord
): ManagerRegistrationDocumentRow {
  return {
    id: record.id,
    file_name: record.file_name,
    mime_type: record.mime_type,
    file_size: record.file_size,
    sort_order: record.sort_order,
    storage_path: record.storage_path,
  };
}

function mapApplicationRecord(
  record: StudentRegistrationApplicationRecord,
  documents: ManagerRegistrationDocumentRow[] = []
): ManagerRegistrationApplicationRow {
  return {
    id: record.id,
    created_at: record.created_at,
    updated_at: record.updated_at,
    status: record.status as RegistrationApplicationStatus,
    notes: record.notes,
    full_name: record.full_name,
    gender: record.gender as RegistrationGender,
    date_of_birth: record.date_of_birth,
    blood_type: record.blood_type as RegistrationBloodType,
    email: record.email,
    phone: record.phone,
    additional_phone: record.additional_phone,
    city: record.city,
    full_address: record.full_address,
    education_level: record.education_level as RegistrationEducationLevel,
    organization_name: record.organization_name,
    speciality: record.speciality,
    learning_status: record.learning_status as RegistrationLearningStatus,
    graduation_year: record.graduation_year,
    self_learning_notes: record.self_learning_notes,
    learning_goal: record.learning_goal,
    skills: record.skills as RegistrationSkill[],
    skills_other: record.skills_other,
    referral_source: record.referral_source as RegistrationReferralSource,
    referral_other: record.referral_other,
    preferred_program: record.preferred_program as RegistrationPreferredProgram,
    available_days: record.available_days as RegistrationWeekday[],
    preferred_shifts: record.preferred_shifts as RegistrationShift[],
    weekly_available_hours: record.weekly_available_hours,
    job_status: record.job_status as RegistrationJobStatus,
    has_transportation: record.has_transportation,
    id_document_type: record.id_document_type as RegistrationIdDocumentType,
    consent_terms: record.consent_terms,
    consent_privacy: record.consent_privacy,
    guardian_name: record.guardian_name,
    guardian_phone: record.guardian_phone,
    guest_id: record.guest_id,
    user_id: record.user_id,
    documents,
  };
}

/** List-table row: only fetched columns are real; detail fields are placeholders. */
function mapApplicationListRecord(
  record: registrationRepository.StudentRegistrationApplicationListRecord
): ManagerRegistrationApplicationRow {
  return {
    id: record.id,
    created_at: record.created_at,
    updated_at: record.created_at,
    status: record.status as RegistrationApplicationStatus,
    notes: null,
    full_name: record.full_name,
    gender: "" as RegistrationGender,
    date_of_birth: "",
    blood_type: "" as RegistrationBloodType,
    email: record.email,
    phone: record.phone,
    additional_phone: null,
    city: record.city,
    full_address: "",
    education_level: "" as RegistrationEducationLevel,
    organization_name: null,
    speciality: null,
    learning_status: "" as RegistrationLearningStatus,
    graduation_year: null,
    self_learning_notes: null,
    learning_goal: "",
    skills: [],
    skills_other: null,
    referral_source: "" as RegistrationReferralSource,
    referral_other: null,
    preferred_program: record.preferred_program as RegistrationPreferredProgram,
    available_days: [],
    preferred_shifts: [],
    weekly_available_hours: 0,
    job_status: "" as RegistrationJobStatus,
    has_transportation: false,
    id_document_type: "" as RegistrationIdDocumentType,
    consent_terms: false,
    consent_privacy: false,
    guardian_name: null,
    guardian_phone: null,
    guest_id: record.guest_id,
    user_id: record.user_id,
    documents: [],
  };
}

export async function tempUploadRegistrationDocument(
  adminClient: Supabase,
  input: TempUploadRegistrationDocumentInput,
  options?: {
    skipRateLimit?: boolean;
  }
): Promise<
  | {
      success: true;
      message: string;
      document: {
        storage_path: string;
        file_name: string;
        mime_type: string;
        file_size: number;
      };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors }
> {
  if (!options?.skipRateLimit) {
    const rate = await checkPublicRegistrationUploadRateLimit();
    if (!rate.allowed) {
      return { success: false, error: rate.message };
    }
  }

  const storagePath = buildRegistrationTempStoragePath(
    input.upload_session_id,
    input.file.name
  );

  const upload = await registrationStorage.uploadRegistrationStorageObject(
    adminClient,
    storagePath,
    input.file,
    input.file.type
  );

  if (upload.error) {
    return {
      success: false,
      error: upload.error.message ?? "Unable to upload document.",
    };
  }

  return {
    success: true,
    message: "Document uploaded.",
    document: {
      storage_path: storagePath,
      file_name: input.file.name,
      mime_type: input.file.type,
      file_size: input.file.size,
    },
  };
}

export async function removeTempRegistrationDocument(
  adminClient: Supabase,
  input: RemoveTempRegistrationDocumentInput
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  if (
    !isRegistrationTempStoragePath(
      input.storage_path,
      input.upload_session_id
    )
  ) {
    return { success: false, error: "Invalid document path." };
  }

  const result = await registrationStorage.removeRegistrationStorageObjects(
    adminClient,
    [input.storage_path]
  );

  if (result.error) {
    return {
      success: false,
      error: result.error.message ?? "Unable to remove document.",
    };
  }

  return { success: true, message: "Document removed." };
}

export async function submitPublicRegistrationApplication(
  adminClient: Supabase,
  input: SubmitPublicRegistrationInput,
  options?: {
    guest_id?: string | null;
    skipRateLimit?: boolean;
  }
): Promise<
  | { success: true; message: string; id: string }
  | { success: false; error: string; fieldErrors?: FieldErrors }
> {
  if (!options?.skipRateLimit) {
    const rate = await checkPublicRegistrationSubmitRateLimit();
    if (!rate.allowed) {
      return { success: false, error: rate.message };
    }
  }

  const result =
    await registrationRepository.createStudentRegistrationApplication(
      adminClient,
      {
        full_name: input.full_name,
        gender: input.gender,
        date_of_birth: input.date_of_birth,
        blood_type: input.blood_type,
        email: input.email,
        phone: input.phone,
        additional_phone: input.additional_phone,
        city: input.city,
        full_address: input.full_address,
        education_level: input.education_level,
        organization_name: input.organization_name,
        speciality: input.speciality,
        learning_status: input.learning_status,
        graduation_year: input.graduation_year ?? null,
        self_learning_notes: input.self_learning_notes,
        learning_goal: input.learning_goal,
        skills: [...input.skills],
        skills_other: input.skills_other,
        referral_source: input.referral_source,
        referral_other: input.referral_other,
        preferred_program: input.preferred_program,
        available_days: [...input.available_days],
        preferred_shifts: [...input.preferred_shifts],
        weekly_available_hours: input.weekly_available_hours,
        job_status: input.job_status,
        has_transportation: input.has_transportation,
        id_document_type: input.id_document_type,
        consent_terms: input.consent_terms,
        consent_privacy: input.consent_privacy,
        guardian_name: input.guardian_name,
        guardian_phone: input.guardian_phone,
        guest_id: options?.guest_id ?? null,
      }
    );

  if (result.error || !result.data) {
    return {
      success: false,
      error: result.error?.message ?? "Unable to submit registration.",
    };
  }

  const applicationId = result.data.id;
  const movedFinalPaths: string[] = [];
  const documentRows: documentRepository.CreateStudentRegistrationDocumentInput[] =
    [];

  try {
    for (
      let index = 0;
      index < input.documents.length;
      index += REGISTRATION_DOCUMENT_MOVE_CONCURRENCY
    ) {
      const chunk = input.documents.slice(
        index,
        index + REGISTRATION_DOCUMENT_MOVE_CONCURRENCY
      );

      const movedChunk = await Promise.all(
        chunk.map(async (doc, chunkIndex) => {
          const sortIndex = index + chunkIndex;

          if (
            !isRegistrationTempStoragePath(
              doc.storage_path,
              input.upload_session_id
            )
          ) {
            throw new Error("Invalid document upload path.");
          }

          const finalPath = buildRegistrationDocumentStoragePath(
            applicationId,
            doc.file_name
          );

          const move = await registrationStorage.moveRegistrationStorageObject(
            adminClient,
            doc.storage_path,
            finalPath
          );

          if (move.error) {
            throw new Error(move.error.message ?? "Unable to finalize documents.");
          }

          return {
            finalPath,
            row: {
              application_id: applicationId,
              storage_path: finalPath,
              file_name: doc.file_name,
              mime_type: doc.mime_type,
              file_size: doc.file_size,
              sort_order: sortIndex,
            } satisfies documentRepository.CreateStudentRegistrationDocumentInput,
          };
        })
      );

      for (const moved of movedChunk) {
        movedFinalPaths.push(moved.finalPath);
        documentRows.push(moved.row);
      }
    }

    const docsResult =
      await documentRepository.createStudentRegistrationDocuments(
        adminClient,
        documentRows
      );

    if (docsResult.error) {
      throw new Error(
        docsResult.error.message ?? "Unable to save document records."
      );
    }
  } catch (error) {
    if (movedFinalPaths.length > 0) {
      await registrationStorage.removeRegistrationStorageObjects(
        adminClient,
        movedFinalPaths
      );
    }
    await registrationRepository.deleteStudentRegistrationApplicationById(
      adminClient,
      applicationId
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to submit registration documents.",
    };
  }

  return {
    success: true,
    id: applicationId,
    message: "Your registration was submitted successfully.",
  };
}

export async function listRegistrationApplicationsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerRegistrationApplicationRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.REGISTRATIONS_VIEW
  );

  const result =
    await registrationRepository.listStudentRegistrationApplicationsForList(
      adminClient,
      { limit: 500 }
    );

  if (result.error) {
    throw new Error(result.error.message);
  }

  const applications = (result.data ??
    []) as registrationRepository.StudentRegistrationApplicationListRecord[];

  // List UI only needs thin fields; detail route loads full app + documents.
  return applications.map((record) => mapApplicationListRecord(record));
}

export async function getRegistrationApplicationDetailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  applicationId: string
): Promise<{
  application: ManagerRegistrationApplicationRow;
  signedDocuments: ManagerRegistrationDocumentSignedRow[];
} | null> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.REGISTRATIONS_VIEW
  );

  const existing =
    await registrationRepository.findStudentRegistrationApplicationById(
      adminClient,
      applicationId
    );

  if (existing.error) {
    throw new Error(existing.error.message);
  }
  if (!existing.data) {
    return null;
  }

  const docsResult =
    await documentRepository.listStudentRegistrationDocumentsByApplicationId(
      adminClient,
      applicationId
    );

  if (docsResult.error) {
    throw new Error(docsResult.error.message);
  }

  const documentRecords = (docsResult.data ??
    []) as documentRepository.StudentRegistrationDocumentRecord[];
  const documents = documentRecords.map((doc) => mapDocumentRecord(doc));
  const signedDocuments = await createSignedUrlsForDocuments(
    adminClient,
    documentRecords
  );

  return {
    application: mapApplicationRecord(
      existing.data as StudentRegistrationApplicationRecord,
      documents
    ),
    signedDocuments,
  };
}

export async function getRegistrationDocumentSignedUrlsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  applicationId: string
): Promise<
  | { success: true; documents: ManagerRegistrationDocumentSignedRow[] }
  | { success: false; error: string }
> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.REGISTRATIONS_VIEW
  );

  const docsResult =
    await documentRepository.listStudentRegistrationDocumentsByApplicationId(
      adminClient,
      applicationId
    );

  if (docsResult.error) {
    return { success: false, error: docsResult.error.message };
  }

  const documentRecords = (docsResult.data ??
    []) as documentRepository.StudentRegistrationDocumentRecord[];

  try {
    const documents = await createSignedUrlsForDocuments(
      adminClient,
      documentRecords
    );

    return { success: true, documents };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create download link.",
    };
  }
}

export async function updateRegistrationApplicationStatusForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: UpdateRegistrationStatusInput
): Promise<
  | { success: true; message: string; application: ManagerRegistrationApplicationRow }
  | { success: false; error: string }
> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.REGISTRATIONS_UPDATE_STATUS
  );

  const existing =
    await registrationRepository.findStudentRegistrationApplicationById(
      adminClient,
      input.id
    );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Application not found." };
  }

  const result =
    await registrationRepository.updateStudentRegistrationApplicationStatus(
      adminClient,
      input.id,
      input.status,
      input.notes
    );

  if (result.error || !result.data) {
    return {
      success: false,
      error: result.error?.message ?? "Unable to update status.",
    };
  }

  return {
    success: true,
    message:
      input.notes !== undefined
        ? "Application updated."
        : "Application status updated.",
    application: mapApplicationRecord(
      result.data as StudentRegistrationApplicationRecord
    ),
  };
}

export async function updateRegistrationApplicationForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: UpdateManagerRegistrationInput
): Promise<
  | { success: true; message: string; application: ManagerRegistrationApplicationRow }
  | { success: false; error: string; fieldErrors?: FieldErrors }
> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.REGISTRATIONS_UPDATE_STATUS
  );

  const existing =
    await registrationRepository.findStudentRegistrationApplicationById(
      adminClient,
      input.id
    );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Application not found." };
  }

  const result =
    await registrationRepository.updateStudentRegistrationApplication(
      adminClient,
      input.id,
      {
        status: input.status,
        notes: input.notes,
        full_name: input.full_name,
        gender: input.gender,
        date_of_birth: input.date_of_birth,
        blood_type: input.blood_type,
        email: input.email,
        phone: input.phone,
        additional_phone: input.additional_phone,
        city: input.city,
        full_address: input.full_address,
        education_level: input.education_level,
        organization_name: input.organization_name,
        speciality: input.speciality,
        learning_status: input.learning_status,
        graduation_year: input.graduation_year ?? null,
        self_learning_notes: input.self_learning_notes,
        learning_goal: input.learning_goal,
        skills: [...input.skills],
        skills_other: input.skills_other,
        referral_source: input.referral_source,
        referral_other: input.referral_other,
        preferred_program: input.preferred_program,
        available_days: [...input.available_days],
        preferred_shifts: [...input.preferred_shifts],
        weekly_available_hours: input.weekly_available_hours,
        job_status: input.job_status,
        has_transportation: input.has_transportation,
        id_document_type: input.id_document_type,
        guardian_name: input.guardian_name,
        guardian_phone: input.guardian_phone,
      }
    );

  if (result.error || !result.data) {
    return {
      success: false,
      error: result.error?.message ?? "Unable to update application.",
    };
  }

  return {
    success: true,
    message: "Application updated.",
    application: mapApplicationRecord(
      result.data as StudentRegistrationApplicationRecord
    ),
  };
}
