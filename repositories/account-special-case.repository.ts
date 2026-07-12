import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SPECIAL_CASE_COLUMNS =
  "id, account_id, semester_id, total_amount, percentage_discount, explanation, approved_by, case_type, status, created_at, updated_at";

export type AccountSpecialCaseRecord = {
  id: string;
  account_id: string;
  semester_id: string;
  total_amount: number;
  percentage_discount: number;
  explanation: string;
  approved_by: string | null;
  case_type: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CreateAccountSpecialCaseInput = {
  account_id: string;
  semester_id: string;
  total_amount: number;
  percentage_discount: number;
  explanation: string;
  approved_by: string | null;
  case_type: string;
  status: string;
};

export type UpdateAccountSpecialCaseInput = {
  total_amount: number;
  percentage_discount: number;
  explanation: string;
  case_type: string;
  status: string;
};

export async function listSpecialCasesByAccountId(
  client: Supabase,
  accountId: string
) {
  return client
    .from("account_special_cases")
    .select(SPECIAL_CASE_COLUMNS)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
}

export async function listSpecialCasesByAccountIds(
  client: Supabase,
  accountIds: string[]
) {
  if (accountIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("account_special_cases")
    .select(SPECIAL_CASE_COLUMNS)
    .in("account_id", accountIds);
}

export async function findSpecialCaseByAccountAndSemester(
  client: Supabase,
  accountId: string,
  semesterId: string
) {
  return client
    .from("account_special_cases")
    .select(SPECIAL_CASE_COLUMNS)
    .eq("account_id", accountId)
    .eq("semester_id", semesterId)
    .maybeSingle();
}

export async function findSpecialCaseById(client: Supabase, id: string) {
  return client
    .from("account_special_cases")
    .select(SPECIAL_CASE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createSpecialCase(
  client: Supabase,
  input: CreateAccountSpecialCaseInput
) {
  return client
    .from("account_special_cases")
    .insert({
      account_id: input.account_id,
      semester_id: input.semester_id,
      total_amount: input.total_amount,
      percentage_discount: input.percentage_discount,
      explanation: input.explanation,
      approved_by: input.approved_by,
      case_type: input.case_type,
      status: input.status,
    })
    .select(SPECIAL_CASE_COLUMNS)
    .single();
}

export async function updateSpecialCase(
  client: Supabase,
  id: string,
  input: UpdateAccountSpecialCaseInput
) {
  return client
    .from("account_special_cases")
    .update({
      total_amount: input.total_amount,
      percentage_discount: input.percentage_discount,
      explanation: input.explanation,
      case_type: input.case_type,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SPECIAL_CASE_COLUMNS)
    .single();
}
