import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SPP_COLUMNS =
  "id, student_id, payment_phase_id, assigned_at, status, original_amount, adjustment_amount, final_amount_due, total_paid, remaining_amount, created_at, updated_at";

export type StudentPaymentPhaseRecord = {
  id: string;
  student_id: string;
  payment_phase_id: string;
  assigned_at: string;
  status: string;
  original_amount: number;
  adjustment_amount: number;
  final_amount_due: number;
  total_paid: number;
  remaining_amount: number;
  created_at: string;
  updated_at: string;
};

export type CreateStudentPaymentPhaseRecordInput = {
  student_id: string;
  payment_phase_id: string;
  assigned_at: string;
  status: string;
  original_amount: number;
  adjustment_amount: number;
  final_amount_due: number;
  total_paid: number;
  remaining_amount: number;
};

export async function listSppsByPaymentPhaseIds(
  client: Supabase,
  paymentPhaseIds: string[]
) {
  if (paymentPhaseIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_payment_phases")
    .select("id, payment_phase_id, status, student_id")
    .in("payment_phase_id", paymentPhaseIds);
}

export async function listSppsByPaymentPhaseId(
  client: Supabase,
  paymentPhaseId: string
) {
  return client
    .from("student_payment_phases")
    .select(SPP_COLUMNS)
    .eq("payment_phase_id", paymentPhaseId)
    .order("created_at", { ascending: false });
}

export async function findSppByStudentAndPhase(
  client: Supabase,
  studentId: string,
  paymentPhaseId: string
) {
  return client
    .from("student_payment_phases")
    .select(SPP_COLUMNS)
    .eq("student_id", studentId)
    .eq("payment_phase_id", paymentPhaseId)
    .maybeSingle();
}

export async function listSppIdsByStudentId(client: Supabase, studentId: string) {
  return client
    .from("student_payment_phases")
    .select("id")
    .eq("student_id", studentId);
}

export async function findSppById(client: Supabase, id: string) {
  return client
    .from("student_payment_phases")
    .select(SPP_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function listSppsByIds(client: Supabase, ids: string[]) {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_payment_phases")
    .select("id, student_id, payment_phase_id, status")
    .in("id", ids);
}

export async function createStudentPaymentPhase(
  client: Supabase,
  input: CreateStudentPaymentPhaseRecordInput
) {
  return client
    .from("student_payment_phases")
    .insert({
      student_id: input.student_id,
      payment_phase_id: input.payment_phase_id,
      assigned_at: input.assigned_at,
      status: input.status,
      original_amount: input.original_amount,
      adjustment_amount: input.adjustment_amount,
      final_amount_due: input.final_amount_due,
      total_paid: input.total_paid,
      remaining_amount: input.remaining_amount,
    })
    .select(SPP_COLUMNS)
    .single();
}

export async function createStudentPaymentPhases(
  client: Supabase,
  inputs: CreateStudentPaymentPhaseRecordInput[]
) {
  if (inputs.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_payment_phases")
    .insert(
      inputs.map((input) => ({
        student_id: input.student_id,
        payment_phase_id: input.payment_phase_id,
        assigned_at: input.assigned_at,
        status: input.status,
        original_amount: input.original_amount,
        adjustment_amount: input.adjustment_amount,
        final_amount_due: input.final_amount_due,
        total_paid: input.total_paid,
        remaining_amount: input.remaining_amount,
      }))
    )
    .select(SPP_COLUMNS);
}

export type UpdateStudentPaymentPhaseFinancialsInput = {
  status: string;
  original_amount: number;
  adjustment_amount: number;
  final_amount_due: number;
  total_paid: number;
  remaining_amount: number;
};

export async function updateStudentPaymentPhaseFinancials(
  client: Supabase,
  id: string,
  input: UpdateStudentPaymentPhaseFinancialsInput
) {
  return client
    .from("student_payment_phases")
    .update({
      status: input.status,
      original_amount: input.original_amount,
      adjustment_amount: input.adjustment_amount,
      final_amount_due: input.final_amount_due,
      total_paid: input.total_paid,
      remaining_amount: input.remaining_amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SPP_COLUMNS)
    .single();
}

export async function updateStudentPaymentPhaseStatus(
  client: Supabase,
  id: string,
  status: string
) {
  return client
    .from("student_payment_phases")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SPP_COLUMNS)
    .single();
}

export async function updateStudentPaymentPhasePaymentPhaseId(
  client: Supabase,
  id: string,
  paymentPhaseId: string
) {
  return client
    .from("student_payment_phases")
    .update({
      payment_phase_id: paymentPhaseId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SPP_COLUMNS)
    .single();
}

export type StudentPaymentPhaseWithPhaseRecord = StudentPaymentPhaseRecord & {
  payment_phases: { id: string; name: string; status: string } | null;
};

export async function listSppsWithPhaseByStudentId(
  client: Supabase,
  studentId: string
) {
  return client
    .from("student_payment_phases")
    .select(
      `${SPP_COLUMNS}, payment_phases ( id, name, status )`
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
}

export async function deleteStudentPaymentPhaseById(
  client: Supabase,
  id: string
) {
  return client
    .from("student_payment_phases")
    .delete()
    .eq("id", id)
    .select(SPP_COLUMNS)
    .maybeSingle();
}
