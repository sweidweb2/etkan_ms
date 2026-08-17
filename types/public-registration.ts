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
import type { FieldErrors } from "@/types/auth";

export type ManagerRegistrationDocumentRow = {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  sort_order: number;
  storage_path: string;
};

export type ManagerRegistrationDocumentSignedRow = {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  signedUrl: string;
};

export type ManagerRegistrationApplicationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: RegistrationApplicationStatus;
  notes: string | null;
  full_name: string;
  gender: RegistrationGender;
  date_of_birth: string;
  blood_type: RegistrationBloodType;
  email: string;
  phone: string;
  additional_phone: string | null;
  city: string;
  full_address: string;
  education_level: RegistrationEducationLevel;
  organization_name: string | null;
  speciality: string | null;
  learning_status: RegistrationLearningStatus;
  graduation_year: number | null;
  self_learning_notes: string | null;
  learning_goal: string;
  skills: RegistrationSkill[];
  referral_source: RegistrationReferralSource;
  referral_other: string | null;
  preferred_program: RegistrationPreferredProgram;
  available_days: RegistrationWeekday[];
  preferred_shifts: RegistrationShift[];
  weekly_available_hours: number;
  job_status: RegistrationJobStatus;
  has_transportation: boolean;
  id_document_type: RegistrationIdDocumentType;
  consent_terms: boolean;
  consent_privacy: boolean;
  guardian_name: string | null;
  guardian_phone: string | null;
  guest_id: string | null;
  user_id: string | null;
  documents: ManagerRegistrationDocumentRow[];
};

export type ManagerRegistrationDetail = {
  application: ManagerRegistrationApplicationRow;
  signedDocuments: ManagerRegistrationDocumentSignedRow[];
};

export type SubmitPublicRegistrationActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export type TempUploadRegistrationDocumentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  document?: {
    storage_path: string;
    file_name: string;
    mime_type: string;
    file_size: number;
  };
};

export type RemoveTempRegistrationDocumentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export type UpdateRegistrationStatusActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export type GetRegistrationDocumentSignedUrlsActionState = {
  success?: boolean;
  error?: string;
  documents?: ManagerRegistrationDocumentSignedRow[];
};
