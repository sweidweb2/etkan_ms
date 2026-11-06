import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { deleteFinancialFormSchema } from "@/lib/validators/manager/delete-financial-form";
import { deleteFinancialFormInviteSchema } from "@/lib/validators/manager/delete-financial-form-invite";
import {
  createFinancialFormInviteSchema,
  createFinancialFormSchema,
  updateFinancialFormSchema,
} from "@/lib/validators/manager/upsert-financial-form";
import type { FinancialFormInviteRecord } from "@/repositories/student-financial-form-invite.repository";
import * as inviteRepository from "@/repositories/student-financial-form-invite.repository";
import type { FinancialFormRecord } from "@/repositories/student-financial-form.repository";
import * as formRepository from "@/repositories/student-financial-form.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import type {
  ManagerFinancialFormInviteRow,
  ManagerFinancialFormRow,
} from "@/types/manager-financial-adjustment";
import { randomBytes } from "crypto";
import type { MutationFailure, Supabase } from "@/services/shared/mutation";
import {
  assertMutationsAllowed,
  loadSppAndPhase,
  mapFormRecord,
  mapInviteRecord,
  type MutationSuccessBase,
} from "./student-financial-adjustment-shared";

export type UpsertFormResult =
  | (MutationSuccessBase & { form: ManagerFinancialFormRow })
  | MutationFailure;

export type DeleteFormResult = MutationSuccessBase | MutationFailure;

export type CreateInviteResult =
  | (MutationSuccessBase & { invite: ManagerFinancialFormInviteRow })
  | MutationFailure;

export type DeleteInviteResult = MutationSuccessBase | MutationFailure;

export async function createFinancialFormForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: CreateFinancialFormInputLike
): Promise<UpsertFormResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createFinancialFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    parsed.data.student_payment_phase_id
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
      ...parsed.data,
      invite_id: null,
      school_or_university: parsed.data.school_or_university,
      date_of_birth: parsed.data.date_of_birth,
      phone: parsed.data.phone,
      parent_phone: parsed.data.parent_phone,
      current_gpa: parsed.data.current_gpa,
      certificates: parsed.data.certificates,
    }
  );

  if (createError || !created) {
    return {
      success: false,
      error: "Unable to create financial form. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_financial_forms",
    record_id: created.id,
    new_data: {
      student_payment_phase_id: created.student_payment_phase_id,
      full_name: created.full_name,
    },
    metadata: { note: "Financial form created." },
  });

  return {
    success: true,
    message: "Financial form saved.",
    form: mapFormRecord(created as FinancialFormRecord),
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
  };
}

type CreateFinancialFormInputLike = {
  student_payment_phase_id: string;
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
};

export async function updateFinancialFormForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: CreateFinancialFormInputLike & { id: string }
): Promise<UpsertFormResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateFinancialFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existingResult, loaded] = await Promise.all([
    formRepository.findFormById(adminClient, parsed.data.id),
    loadSppAndPhase(adminClient, parsed.data.student_payment_phase_id),
  ]);

  if (existingResult.error || !existingResult.data) {
    return { success: false, error: "Financial form not found." };
  }

  const existing = existingResult.data;

  if (existing.student_payment_phase_id !== parsed.data.student_payment_phase_id) {
    return {
      success: false,
      error: "Form does not belong to this student payment phase.",
    };
  }

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

  const { data: updated, error: updateError } = await formRepository.updateForm(
    adminClient,
    parsed.data.id,
    {
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

  if (updateError || !updated) {
    return {
      success: false,
      error: "Unable to update financial form. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_financial_forms",
    record_id: updated.id,
    old_data: { full_name: existing.full_name },
    new_data: { full_name: updated.full_name },
    metadata: { note: "Financial form updated." },
  });

  return {
    success: true,
    message: "Financial form updated.",
    form: mapFormRecord(updated as FinancialFormRecord),
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
  };
}

export async function deleteFinancialFormForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { id: string; student_payment_phase_id: string }
): Promise<DeleteFormResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteFinancialFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existingResult, loaded] = await Promise.all([
    formRepository.findFormById(adminClient, parsed.data.id),
    loadSppAndPhase(adminClient, parsed.data.student_payment_phase_id),
  ]);

  if (existingResult.error || !existingResult.data) {
    return { success: false, error: "Financial form not found." };
  }

  const existing = existingResult.data;

  if (existing.student_payment_phase_id !== parsed.data.student_payment_phase_id) {
    return {
      success: false,
      error: "Form does not belong to this student payment phase.",
    };
  }

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

  const { error: deleteError } = await formRepository.deleteForm(
    adminClient,
    existing.id
  );

  if (deleteError) {
    return {
      success: false,
      error: "Unable to delete financial form. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_financial_forms",
    record_id: existing.id,
    old_data: {
      student_payment_phase_id: existing.student_payment_phase_id,
      full_name: existing.full_name,
      invite_id: existing.invite_id,
    },
    metadata: { note: "Financial form deleted." },
  });

  return {
    success: true,
    message: "Financial form deleted.",
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
  };
}

export async function createFinancialFormInviteForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { student_payment_phase_id: string }
): Promise<CreateInviteResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createFinancialFormInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    parsed.data.student_payment_phase_id
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

  const token = randomBytes(32).toString("base64url");
  const { data: created, error: createError } = await inviteRepository.createInvite(
    adminClient,
    {
      student_payment_phase_id: loaded.spp.id,
      token,
      created_by: actor.userId,
    }
  );

  if (createError || !created) {
    return {
      success: false,
      error: "Unable to create invite link. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_financial_form_invites",
    record_id: created.id,
    new_data: {
      student_payment_phase_id: created.student_payment_phase_id,
    },
    metadata: { note: "Financial form invite created." },
  });

  return {
    success: true,
    message: "Invite link created.",
    invite: mapInviteRecord(created as FinancialFormInviteRecord),
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
  };
}

export async function deleteFinancialFormInviteForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { id: string; student_payment_phase_id: string }
): Promise<DeleteInviteResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteFinancialFormInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existingResult, loaded] = await Promise.all([
    inviteRepository.findInviteById(adminClient, parsed.data.id),
    loadSppAndPhase(adminClient, parsed.data.student_payment_phase_id),
  ]);

  if (existingResult.error || !existingResult.data) {
    return { success: false, error: "Invite link not found." };
  }

  const existing = existingResult.data;

  if (existing.student_payment_phase_id !== parsed.data.student_payment_phase_id) {
    return {
      success: false,
      error: "Invite does not belong to this student payment phase.",
    };
  }

  if (existing.used_at !== null) {
    return {
      success: false,
      error: "Used invite links cannot be deleted.",
    };
  }

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

  const { error: deleteError } = await inviteRepository.deleteInvite(
    adminClient,
    existing.id
  );

  if (deleteError) {
    return {
      success: false,
      error: "Unable to delete invite link. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_financial_form_invites",
    record_id: existing.id,
    old_data: {
      student_payment_phase_id: existing.student_payment_phase_id,
      created_at: existing.created_at,
    },
    metadata: { note: "Financial form invite deleted." },
  });

  return {
    success: true,
    message: "Invite link deleted.",
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
  };
}
