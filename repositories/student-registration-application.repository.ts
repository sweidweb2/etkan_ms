import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const APPLICATION_COLUMNS =
  "id, created_at, updated_at, status, notes, full_name, gender, date_of_birth, blood_type, email, phone, additional_phone, city, full_address, education_level, organization_name, speciality, learning_status, graduation_year, self_learning_notes, learning_goal, skills, skills_other, referral_source, referral_other, preferred_program, available_days, preferred_shifts, weekly_available_hours, job_status, has_transportation, consent_terms, consent_privacy, guardian_name, guardian_phone, id_document_type, guest_id, user_id";

/** Columns needed by the manager registrations table (not detail). */
const APPLICATION_LIST_COLUMNS =
  "id, created_at, status, full_name, email, phone, city, preferred_program, guest_id, user_id";

export type StudentRegistrationApplicationListRecord = {
  id: string;
  created_at: string;
  status: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  preferred_program: string;
  guest_id: string | null;
  user_id: string | null;
};

export type StudentRegistrationApplicationRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  notes: string | null;
  full_name: string;
  gender: string;
  date_of_birth: string;
  blood_type: string;
  email: string;
  phone: string;
  additional_phone: string | null;
  city: string;
  full_address: string;
  education_level: string;
  organization_name: string | null;
  speciality: string | null;
  learning_status: string;
  graduation_year: number | null;
  self_learning_notes: string | null;
  learning_goal: string;
  skills: string[];
  skills_other: string | null;
  referral_source: string;
  referral_other: string | null;
  preferred_program: string;
  available_days: string[];
  preferred_shifts: string[];
  weekly_available_hours: number;
  job_status: string;
  has_transportation: boolean;
  consent_terms: boolean;
  consent_privacy: boolean;
  guardian_name: string | null;
  guardian_phone: string | null;
  id_document_type: string;
  guest_id: string | null;
  user_id: string | null;
};

export type CreateStudentRegistrationApplicationInput = {
  full_name: string;
  gender: string;
  date_of_birth: string;
  blood_type: string;
  email: string;
  phone: string;
  additional_phone: string | null;
  city: string;
  full_address: string;
  education_level: string;
  organization_name: string | null;
  speciality: string | null;
  learning_status: string;
  graduation_year: number | null;
  self_learning_notes: string | null;
  learning_goal: string;
  skills: string[];
  skills_other: string | null;
  referral_source: string;
  referral_other: string | null;
  preferred_program: string;
  available_days: string[];
  preferred_shifts: string[];
  weekly_available_hours: number;
  job_status: string;
  has_transportation: boolean;
  consent_terms: boolean;
  consent_privacy: boolean;
  guardian_name: string | null;
  guardian_phone: string | null;
  id_document_type: string;
  guest_id?: string | null;
};

export async function createStudentRegistrationApplication(
  client: Supabase,
  input: CreateStudentRegistrationApplicationInput
) {
  return client
    .from("student_registration_applications")
    .insert({
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
      graduation_year: input.graduation_year,
      self_learning_notes: input.self_learning_notes,
      learning_goal: input.learning_goal,
      skills: input.skills,
      skills_other: input.skills_other,
      referral_source: input.referral_source,
      referral_other: input.referral_other,
      preferred_program: input.preferred_program,
      available_days: input.available_days,
      preferred_shifts: input.preferred_shifts,
      weekly_available_hours: input.weekly_available_hours,
      job_status: input.job_status,
      has_transportation: input.has_transportation,
      consent_terms: input.consent_terms,
      consent_privacy: input.consent_privacy,
      guardian_name: input.guardian_name,
      guardian_phone: input.guardian_phone,
      id_document_type: input.id_document_type,
      guest_id: input.guest_id ?? null,
    })
    .select(APPLICATION_COLUMNS)
    .single();
}

export async function listStudentRegistrationApplications(
  client: Supabase,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 500;
  return client
    .from("student_registration_applications")
    .select(APPLICATION_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
}

/** Slim list for manager registrations table (no docs / detail fields). */
export async function listStudentRegistrationApplicationsForList(
  client: Supabase,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 500;
  return client
    .from("student_registration_applications")
    .select(APPLICATION_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function findStudentRegistrationApplicationById(
  client: Supabase,
  id: string
) {
  return client
    .from("student_registration_applications")
    .select(APPLICATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function updateStudentRegistrationApplicationStatus(
  client: Supabase,
  id: string,
  status: string,
  notes?: string | null
) {
  const payload: {
    status: string;
    updated_at: string;
    notes?: string | null;
  } = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (notes !== undefined) {
    payload.notes = notes;
  }

  return client
    .from("student_registration_applications")
    .update(payload)
    .eq("id", id)
    .select(APPLICATION_COLUMNS)
    .single();
}

export type UpdateStudentRegistrationApplicationInput = {
  status: string;
  notes: string | null;
  full_name: string;
  gender: string;
  date_of_birth: string;
  blood_type: string;
  email: string;
  phone: string;
  additional_phone: string | null;
  city: string;
  full_address: string;
  education_level: string;
  organization_name: string | null;
  speciality: string | null;
  learning_status: string;
  graduation_year: number | null;
  self_learning_notes: string | null;
  learning_goal: string;
  skills: string[];
  skills_other: string | null;
  referral_source: string;
  referral_other: string | null;
  preferred_program: string;
  available_days: string[];
  preferred_shifts: string[];
  weekly_available_hours: number;
  job_status: string;
  has_transportation: boolean;
  id_document_type: string;
  guardian_name: string | null;
  guardian_phone: string | null;
};

export async function updateStudentRegistrationApplication(
  client: Supabase,
  id: string,
  input: UpdateStudentRegistrationApplicationInput
) {
  return client
    .from("student_registration_applications")
    .update({
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
      graduation_year: input.graduation_year,
      self_learning_notes: input.self_learning_notes,
      learning_goal: input.learning_goal,
      skills: input.skills,
      skills_other: input.skills_other,
      referral_source: input.referral_source,
      referral_other: input.referral_other,
      preferred_program: input.preferred_program,
      available_days: input.available_days,
      preferred_shifts: input.preferred_shifts,
      weekly_available_hours: input.weekly_available_hours,
      job_status: input.job_status,
      has_transportation: input.has_transportation,
      id_document_type: input.id_document_type,
      guardian_name: input.guardian_name,
      guardian_phone: input.guardian_phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(APPLICATION_COLUMNS)
    .single();
}

export async function countPendingApplicationsByEmail(
  client: Supabase,
  email: string
) {
  return client
    .from("student_registration_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .ilike("email", email);
}

export async function findActiveApplicationByGuestId(
  client: Supabase,
  guestId: string
) {
  return client
    .from("student_registration_applications")
    .select(APPLICATION_COLUMNS)
    .eq("guest_id", guestId)
    .neq("status", "cancelled")
    .maybeSingle();
}

export async function findActiveApplicationByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("student_registration_applications")
    .select(APPLICATION_COLUMNS)
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .maybeSingle();
}

export async function findLatestApplicationIdByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("student_registration_applications")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function updateApplicationUserId(
  client: Supabase,
  applicationId: string,
  userId: string
) {
  return client
    .from("student_registration_applications")
    .update({
      user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select(APPLICATION_COLUMNS)
    .single();
}

export async function listApplicationIdsByGuestId(
  client: Supabase,
  guestId: string
) {
  return client
    .from("student_registration_applications")
    .select("id")
    .eq("guest_id", guestId);
}

/** Active (non-cancelled) registration emails keyed by guest, newest first. */
export async function listActiveEmailsByGuestIds(
  client: Supabase,
  guestIds: readonly string[]
) {
  if (guestIds.length === 0) {
    return {
      data: [] as { guest_id: string; email: string }[],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    };
  }

  return client
    .from("student_registration_applications")
    .select("guest_id, email, created_at")
    .in("guest_id", [...guestIds])
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });
}

export async function deleteStudentRegistrationApplicationById(
  client: Supabase,
  id: string
) {
  return client.from("student_registration_applications").delete().eq("id", id);
}
