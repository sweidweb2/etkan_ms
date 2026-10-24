import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const CLEARANCE_COLUMNS =
  "id, student_payment_phase_id, duration_days, notes, created_by, updated_by, created_at, updated_at";

export type StudentPaymentPhaseClearanceRecord = {
  id: string;
  student_payment_phase_id: string;
  duration_days: number;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function findClearanceBySppId(client: Supabase, sppId: string) {
  return client
    .from("student_payment_phase_clearances")
    .select(CLEARANCE_COLUMNS)
    .eq("student_payment_phase_id", sppId)
    .maybeSingle();
}

export async function findClearancesBySppIds(
  client: Supabase,
  sppIds: string[]
) {
  if (sppIds.length === 0) {
    return { data: [] as StudentPaymentPhaseClearanceRecord[], error: null };
  }

  return client
    .from("student_payment_phase_clearances")
    .select(CLEARANCE_COLUMNS)
    .in("student_payment_phase_id", sppIds);
}

export async function findClearanceById(client: Supabase, id: string) {
  return client
    .from("student_payment_phase_clearances")
    .select(CLEARANCE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function insertClearance(
  client: Supabase,
  input: {
    student_payment_phase_id: string;
    duration_days: number;
    notes: string | null;
    created_by: string | null;
  }
) {
  return client
    .from("student_payment_phase_clearances")
    .insert({
      student_payment_phase_id: input.student_payment_phase_id,
      duration_days: input.duration_days,
      notes: input.notes,
      created_by: input.created_by,
      updated_by: input.created_by,
    })
    .select(CLEARANCE_COLUMNS)
    .single();
}

export async function updateClearance(
  client: Supabase,
  id: string,
  input: {
    duration_days: number;
    notes: string | null;
    updated_by: string | null;
  }
) {
  return client
    .from("student_payment_phase_clearances")
    .update({
      duration_days: input.duration_days,
      notes: input.notes,
      updated_by: input.updated_by,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(CLEARANCE_COLUMNS)
    .single();
}

export async function deleteClearanceById(client: Supabase, id: string) {
  return client
    .from("student_payment_phase_clearances")
    .delete()
    .eq("id", id)
    .select(CLEARANCE_COLUMNS)
    .maybeSingle();
}

export async function deleteClearanceBySppId(client: Supabase, sppId: string) {
  return client
    .from("student_payment_phase_clearances")
    .delete()
    .eq("student_payment_phase_id", sppId)
    .select(CLEARANCE_COLUMNS)
    .maybeSingle();
}

export async function deleteClearancesBySppIds(
  client: Supabase,
  sppIds: string[]
) {
  if (sppIds.length === 0) {
    return { data: [] as StudentPaymentPhaseClearanceRecord[], error: null };
  }

  return client
    .from("student_payment_phase_clearances")
    .delete()
    .in("student_payment_phase_id", sppIds)
    .select(CLEARANCE_COLUMNS);
}

export async function insertClearancesBulk(
  client: Supabase,
  rows: Array<{
    student_payment_phase_id: string;
    duration_days: number;
    notes: string | null;
    created_by: string | null;
  }>
) {
  if (rows.length === 0) {
    return { data: [] as StudentPaymentPhaseClearanceRecord[], error: null };
  }

  return client
    .from("student_payment_phase_clearances")
    .insert(
      rows.map((row) => ({
        student_payment_phase_id: row.student_payment_phase_id,
        duration_days: row.duration_days,
        notes: row.notes,
        created_by: row.created_by,
        updated_by: row.created_by,
      }))
    )
    .select(CLEARANCE_COLUMNS);
}
