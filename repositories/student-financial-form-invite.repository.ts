import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const INVITE_COLUMNS =
  "id, student_payment_phase_id, token, created_by, created_at, used_at, form_id";

export type FinancialFormInviteRecord = {
  id: string;
  student_payment_phase_id: string;
  token: string;
  created_by: string | null;
  created_at: string;
  used_at: string | null;
  form_id: string | null;
};

export type CreateFinancialFormInviteInput = {
  student_payment_phase_id: string;
  token: string;
  created_by: string | null;
};

export async function createInvite(
  client: Supabase,
  input: CreateFinancialFormInviteInput
) {
  return client
    .from("student_financial_form_invites")
    .insert({
      student_payment_phase_id: input.student_payment_phase_id,
      token: input.token,
      created_by: input.created_by,
    })
    .select(INVITE_COLUMNS)
    .single();
}

export async function findInviteByToken(client: Supabase, token: string) {
  return client
    .from("student_financial_form_invites")
    .select(INVITE_COLUMNS)
    .eq("token", token)
    .maybeSingle();
}

export async function listInvitesBySppId(client: Supabase, sppId: string) {
  return client
    .from("student_financial_form_invites")
    .select(INVITE_COLUMNS)
    .eq("student_payment_phase_id", sppId)
    .order("created_at", { ascending: false });
}

export async function findInviteById(client: Supabase, id: string) {
  return client
    .from("student_financial_form_invites")
    .select(INVITE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function deleteInvite(client: Supabase, id: string) {
  return client.from("student_financial_form_invites").delete().eq("id", id);
}

export async function markInviteUsed(
  client: Supabase,
  inviteId: string,
  formId: string,
  usedAt: string
) {
  return client
    .from("student_financial_form_invites")
    .update({
      used_at: usedAt,
      form_id: formId,
    })
    .eq("id", inviteId)
    .is("used_at", null)
    .select(INVITE_COLUMNS)
    .maybeSingle();
}
