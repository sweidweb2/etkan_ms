import "server-only";

import { submitPublicFinancialFormSchema } from "@/lib/validators/manager/upsert-financial-form";
import { checkPublicFinancialFormSubmitRateLimit } from "@/lib/rate-limit/public-financial-form-rate-limit";
import * as inviteRepository from "@/repositories/student-financial-form-invite.repository";
import * as formRepository from "@/repositories/student-financial-form.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import type { PublicFinancialFormInviteContext } from "@/types/manager-financial-adjustment";
import type { MutationFailure, Supabase } from "@/services/shared/mutation";
import {
  assertMutationsAllowed,
  loadSppAndPhase,
} from "./student-financial-adjustment-shared";

export type PublicSubmitFormResult =
  | { success: true; message: string }
  | MutationFailure;

async function resolvePublicStudentLabel(
  adminClient: Supabase,
  studentId: string
): Promise<string> {
  const [{ data: profile }, { data: studentProfiles }] = await Promise.all([
    profileRepository.findProfileById(adminClient, studentId),
    studentProfileRepository.listStudentProfilesByUserIds(adminClient, [
      studentId,
    ]),
  ]);

  const fullName = studentProfiles?.[0]?.full_name?.trim();
  const username = profile?.username?.trim();
  return fullName || username || "Student";
}

export async function getInviteFormContextByToken(
  adminClient: Supabase,
  token: string
): Promise<PublicFinancialFormInviteContext | null> {
  const { data: invite, error } = await inviteRepository.findInviteByToken(
    adminClient,
    token
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!invite) {
    return null;
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    invite.student_payment_phase_id
  );
  if ("error" in loaded) {
    return null;
  }

  const student_label = await resolvePublicStudentLabel(
    adminClient,
    loaded.spp.student_id
  );

  return {
    token: invite.token,
    student_label,
    payment_phase_name: loaded.phase.name,
    is_used: invite.used_at !== null,
  };
}

export async function submitFinancialFormByToken(
  adminClient: Supabase,
  input: {
    token: string;
    full_name: string;
    school_or_university?: string | null;
    date_of_birth?: string | null;
    phone?: string | null;
    parent_phone?: string | null;
    current_gpa?: string | null;
    received_financial_aid_before: boolean;
    certificates?: string | null;
    family_members?: number | null;
    working_family_members?: number | null;
    total_family_income?: number | null;
    children_currently_learning?: number | null;
    has_deceased_parent: boolean;
    both_parents_work: boolean;
    family_hardship: boolean;
    family_chronic_disease: boolean;
    affordable_monthly_payment?: number | null;
    student_works: boolean;
    student_monthly_income?: number | null;
    agreed_to_rules: boolean;
  }
): Promise<PublicSubmitFormResult> {
  const rateLimit = await checkPublicFinancialFormSubmitRateLimit(input.token);
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.message };
  }

  const parsed = submitPublicFinancialFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data: invite, error: inviteError } =
    await inviteRepository.findInviteByToken(adminClient, parsed.data.token);

  if (inviteError) {
    return {
      success: false,
      error: "Unable to submit form. Please try again.",
    };
  }

  if (!invite) {
    return { success: false, error: "This link is no longer valid." };
  }

  if (invite.used_at) {
    return {
      success: false,
      error: "This link has already been used.",
    };
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    invite.student_payment_phase_id
  );
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const blocked = assertMutationsAllowed(
    loaded.phase.status,
    loaded.spp.status,
    loaded.dropCompleted
  );
  if (blocked) {
    return { success: false, error: blocked };
  }

  const { data: created, error: createError } = await formRepository.createForm(
    adminClient,
    {
      student_payment_phase_id: loaded.spp.id,
      invite_id: invite.id,
      full_name: parsed.data.full_name,
      school_or_university: parsed.data.school_or_university,
      date_of_birth: parsed.data.date_of_birth,
      phone: parsed.data.phone,
      parent_phone: parsed.data.parent_phone,
      current_gpa: parsed.data.current_gpa,
      received_financial_aid_before: parsed.data.received_financial_aid_before,
      certificates: parsed.data.certificates,
      family_members: parsed.data.family_members,
      working_family_members: parsed.data.working_family_members,
      total_family_income: parsed.data.total_family_income,
      children_currently_learning: parsed.data.children_currently_learning,
      has_deceased_parent: parsed.data.has_deceased_parent,
      both_parents_work: parsed.data.both_parents_work,
      family_hardship: parsed.data.family_hardship,
      family_chronic_disease: parsed.data.family_chronic_disease,
      affordable_monthly_payment: parsed.data.affordable_monthly_payment,
      student_works: parsed.data.student_works,
      student_monthly_income: parsed.data.student_monthly_income,
      agreed_to_rules: parsed.data.agreed_to_rules,
    }
  );

  if (createError || !created) {
    return {
      success: false,
      error: "Unable to submit form. Please try again.",
    };
  }

  const usedAt = new Date().toISOString();
  const { data: marked, error: markError } = await inviteRepository.markInviteUsed(
    adminClient,
    invite.id,
    created.id,
    usedAt
  );

  if (markError || !marked) {
    return {
      success: false,
      error: "This link has already been used.",
    };
  }

  return {
    success: true,
    message: "Financial form submitted successfully.",
  };
}
