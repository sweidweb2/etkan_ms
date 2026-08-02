import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const WORKSHOP_PAYMENT_COLUMNS =
  "id, workshop_id, amount, type, payment_date, payment_method, notes, created_by, created_at";

export type WorkshopPaymentRecord = {
  id: string;
  workshop_id: string;
  amount: number;
  type: string;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type CreateWorkshopPaymentRecordInput = {
  workshop_id: string;
  amount: number;
  type: string;
  payment_date: string;
  payment_method?: string | null;
  notes?: string | null;
  created_by?: string | null;
};

export type UpdateWorkshopPaymentRecordInput = {
  amount: number;
  type: string;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
};

export async function listWorkshopPaymentsByWorkshopId(
  client: Supabase,
  workshopId: string
) {
  return client
    .from("workshop_payments")
    .select(WORKSHOP_PAYMENT_COLUMNS)
    .eq("workshop_id", workshopId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function findWorkshopPaymentById(client: Supabase, id: string) {
  return client
    .from("workshop_payments")
    .select(WORKSHOP_PAYMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createWorkshopPayment(
  client: Supabase,
  input: CreateWorkshopPaymentRecordInput
) {
  return client
    .from("workshop_payments")
    .insert({
      workshop_id: input.workshop_id,
      amount: input.amount,
      type: input.type,
      payment_date: input.payment_date,
      payment_method: input.payment_method ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by ?? null,
    })
    .select(WORKSHOP_PAYMENT_COLUMNS)
    .single();
}

export async function updateWorkshopPaymentById(
  client: Supabase,
  id: string,
  input: UpdateWorkshopPaymentRecordInput
) {
  return client
    .from("workshop_payments")
    .update({
      amount: input.amount,
      type: input.type,
      payment_date: input.payment_date,
      payment_method: input.payment_method,
      notes: input.notes,
    })
    .eq("id", id)
    .select(WORKSHOP_PAYMENT_COLUMNS)
    .single();
}

export async function deleteWorkshopPaymentById(client: Supabase, id: string) {
  return client.from("workshop_payments").delete().eq("id", id);
}
