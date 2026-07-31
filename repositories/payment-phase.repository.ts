import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const PAYMENT_PHASE_COLUMNS =
  "id, name, class_id, semester_code, amount, upfront_amount, duration_months, start_date, end_date, status, created_at, updated_at";

const PAYMENT_PHASE_LIST_SELECT = `${PAYMENT_PHASE_COLUMNS}, classes ( id, name, semester_id, semesters ( name, semester_code ) )`;

export type PaymentPhaseRecord = {
  id: string;
  name: string;
  class_id: string;
  semester_code: string;
  amount: number;
  upfront_amount: number;
  duration_months: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PaymentPhaseListRecord = PaymentPhaseRecord & {
  classes: {
    id: string;
    name: string;
    semester_id: string | null;
    semesters: { name: string; semester_code: string } | null;
  } | null;
};

export type CreatePaymentPhaseRecordInput = {
  name: string;
  class_id: string;
  semester_code: string;
  amount: number;
  upfront_amount: number;
  duration_months: number;
  start_date: string;
  end_date: string;
  status: string;
};

export async function listPaymentPhases(client: Supabase) {
  return client
    .from("payment_phases")
    .select(PAYMENT_PHASE_LIST_SELECT)
    .order("created_at", { ascending: false });
}

export async function findPaymentPhaseById(client: Supabase, id: string) {
  return client
    .from("payment_phases")
    .select(PAYMENT_PHASE_LIST_SELECT)
    .eq("id", id)
    .maybeSingle();
}

export async function findOpenedPaymentPhaseByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("payment_phases")
    .select(PAYMENT_PHASE_COLUMNS)
    .eq("class_id", classId)
    .eq("status", "opened")
    .maybeSingle();
}

export async function listOpenedPaymentPhases(client: Supabase) {
  return client
    .from("payment_phases")
    .select(PAYMENT_PHASE_LIST_SELECT)
    .eq("status", "opened")
    .order("created_at", { ascending: false });
}

export async function listOpenedPaymentPhaseClassIds(client: Supabase) {
  return client
    .from("payment_phases")
    .select("class_id")
    .eq("status", "opened");
}

export async function createPaymentPhase(
  client: Supabase,
  input: CreatePaymentPhaseRecordInput
) {
  return client
    .from("payment_phases")
    .insert({
      name: input.name,
      class_id: input.class_id,
      semester_code: input.semester_code,
      amount: input.amount,
      upfront_amount: input.upfront_amount,
      duration_months: input.duration_months,
      start_date: input.start_date,
      end_date: input.end_date,
      status: input.status,
    })
    .select(PAYMENT_PHASE_COLUMNS)
    .single();
}

export type UpdatePaymentPhaseRecordInput = {
  name: string;
  amount: number;
  upfront_amount: number;
  duration_months: number;
  start_date: string;
  end_date: string;
};

export async function updatePaymentPhase(
  client: Supabase,
  id: string,
  input: UpdatePaymentPhaseRecordInput
) {
  return client
    .from("payment_phases")
    .update({
      name: input.name,
      amount: input.amount,
      upfront_amount: input.upfront_amount,
      duration_months: input.duration_months,
      start_date: input.start_date,
      end_date: input.end_date,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(PAYMENT_PHASE_LIST_SELECT)
    .single();
}

export async function updatePaymentPhaseStatus(
  client: Supabase,
  id: string,
  status: string
) {
  return client
    .from("payment_phases")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(PAYMENT_PHASE_LIST_SELECT)
    .single();
}
