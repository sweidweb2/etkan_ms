import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const PAYMENT_COLUMNS =
  "id, student_payment_phase_id, payment_date, amount, payment_method, received_by, received_by_management, receipt_number, notes, created_at, updated_at";

export type StudentPaymentRecord = {
  id: string;
  student_payment_phase_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  received_by: string;
  received_by_management: boolean;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateStudentPaymentRecordInput = {
  student_payment_phase_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  received_by: string;
  received_by_management: boolean;
  receipt_number: string | null;
  notes: string | null;
};

export type UpdateStudentPaymentRecordInput = {
  payment_date: string;
  amount: number;
  payment_method: string;
  received_by: string;
  received_by_management: boolean;
  receipt_number: string | null;
  notes: string | null;
};

export async function listPaymentAmountsBySppIds(
  client: Supabase,
  sppIds: string[]
) {
  if (sppIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_payments")
    .select("student_payment_phase_id, amount")
    .in("student_payment_phase_id", sppIds);
}

export async function listPaymentsBySppId(client: Supabase, sppId: string) {
  return client
    .from("student_payments")
    .select(PAYMENT_COLUMNS)
    .eq("student_payment_phase_id", sppId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function findPaymentById(client: Supabase, id: string) {
  return client
    .from("student_payments")
    .select(PAYMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createStudentPayment(
  client: Supabase,
  input: CreateStudentPaymentRecordInput
) {
  return client
    .from("student_payments")
    .insert({
      student_payment_phase_id: input.student_payment_phase_id,
      payment_date: input.payment_date,
      amount: input.amount,
      payment_method: input.payment_method,
      received_by: input.received_by,
      received_by_management: input.received_by_management,
      receipt_number: input.receipt_number,
      notes: input.notes,
    })
    .select(PAYMENT_COLUMNS)
    .single();
}

export async function updateStudentPayment(
  client: Supabase,
  id: string,
  input: UpdateStudentPaymentRecordInput
) {
  return client
    .from("student_payments")
    .update({
      payment_date: input.payment_date,
      amount: input.amount,
      payment_method: input.payment_method,
      received_by: input.received_by,
      received_by_management: input.received_by_management,
      receipt_number: input.receipt_number,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(PAYMENT_COLUMNS)
    .single();
}

export async function deleteStudentPayment(client: Supabase, id: string) {
  return client.from("student_payments").delete().eq("id", id);
}
