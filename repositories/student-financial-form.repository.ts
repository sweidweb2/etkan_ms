import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const FORM_COLUMNS =
  "id, student_payment_phase_id, invite_id, full_name, school_or_university, date_of_birth, phone, parent_phone, current_gpa, received_financial_aid_before, certificates, family_members, working_family_members, total_family_income, children_currently_learning, has_deceased_parent, both_parents_work, family_hardship, family_chronic_disease, affordable_monthly_payment, student_works, student_monthly_income, agreed_to_rules, created_at, updated_at";

export type FinancialFormRecord = {
  id: string;
  student_payment_phase_id: string;
  invite_id: string | null;
  full_name: string;
  school_or_university: string | null;
  date_of_birth: string | null;
  phone: string | null;
  parent_phone: string | null;
  current_gpa: string | null;
  received_financial_aid_before: boolean;
  certificates: string | null;
  family_members: number | null;
  working_family_members: number | null;
  total_family_income: number | null;
  children_currently_learning: number | null;
  has_deceased_parent: boolean;
  both_parents_work: boolean;
  family_hardship: boolean;
  family_chronic_disease: boolean;
  affordable_monthly_payment: number | null;
  student_works: boolean;
  student_monthly_income: number | null;
  agreed_to_rules: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateFinancialFormRecordInput = {
  student_payment_phase_id: string;
  invite_id?: string | null;
  full_name: string;
  school_or_university: string | null;
  date_of_birth: string | null;
  phone: string | null;
  parent_phone: string | null;
  current_gpa: string | null;
  received_financial_aid_before: boolean;
  certificates: string | null;
  family_members: number | null;
  working_family_members: number | null;
  total_family_income: number | null;
  children_currently_learning: number | null;
  has_deceased_parent: boolean;
  both_parents_work: boolean;
  family_hardship: boolean;
  family_chronic_disease: boolean;
  affordable_monthly_payment: number | null;
  student_works: boolean;
  student_monthly_income: number | null;
  agreed_to_rules: boolean;
};

export type UpdateFinancialFormRecordInput = Omit<
  CreateFinancialFormRecordInput,
  "student_payment_phase_id" | "invite_id"
>;

export async function listFormsBySppId(client: Supabase, sppId: string) {
  return client
    .from("student_financial_forms")
    .select(FORM_COLUMNS)
    .eq("student_payment_phase_id", sppId)
    .order("created_at", { ascending: false });
}

export async function findFormById(client: Supabase, id: string) {
  return client
    .from("student_financial_forms")
    .select(FORM_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createForm(
  client: Supabase,
  input: CreateFinancialFormRecordInput
) {
  return client
    .from("student_financial_forms")
    .insert({
      student_payment_phase_id: input.student_payment_phase_id,
      invite_id: input.invite_id ?? null,
      full_name: input.full_name,
      school_or_university: input.school_or_university,
      date_of_birth: input.date_of_birth,
      phone: input.phone,
      parent_phone: input.parent_phone,
      current_gpa: input.current_gpa,
      received_financial_aid_before: input.received_financial_aid_before,
      certificates: input.certificates,
      family_members: input.family_members,
      working_family_members: input.working_family_members,
      total_family_income: input.total_family_income,
      children_currently_learning: input.children_currently_learning,
      has_deceased_parent: input.has_deceased_parent,
      both_parents_work: input.both_parents_work,
      family_hardship: input.family_hardship,
      family_chronic_disease: input.family_chronic_disease,
      affordable_monthly_payment: input.affordable_monthly_payment,
      student_works: input.student_works,
      student_monthly_income: input.student_monthly_income,
      agreed_to_rules: input.agreed_to_rules,
    })
    .select(FORM_COLUMNS)
    .single();
}

export async function updateForm(
  client: Supabase,
  id: string,
  input: UpdateFinancialFormRecordInput
) {
  return client
    .from("student_financial_forms")
    .update({
      full_name: input.full_name,
      school_or_university: input.school_or_university,
      date_of_birth: input.date_of_birth,
      phone: input.phone,
      parent_phone: input.parent_phone,
      current_gpa: input.current_gpa,
      received_financial_aid_before: input.received_financial_aid_before,
      certificates: input.certificates,
      family_members: input.family_members,
      working_family_members: input.working_family_members,
      total_family_income: input.total_family_income,
      children_currently_learning: input.children_currently_learning,
      has_deceased_parent: input.has_deceased_parent,
      both_parents_work: input.both_parents_work,
      family_hardship: input.family_hardship,
      family_chronic_disease: input.family_chronic_disease,
      affordable_monthly_payment: input.affordable_monthly_payment,
      student_works: input.student_works,
      student_monthly_income: input.student_monthly_income,
      agreed_to_rules: input.agreed_to_rules,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(FORM_COLUMNS)
    .single();
}

export async function deleteForm(client: Supabase, id: string) {
  return client.from("student_financial_forms").delete().eq("id", id);
}
