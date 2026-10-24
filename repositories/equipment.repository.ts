import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const EQUIPMENT_COLUMNS =
  "id, name, description, quantity, unit_price, created_at";

export type EquipmentRecord = {
  id: string;
  name: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  created_at: string | null;
};

export type CreateEquipmentRecordInput = {
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
};

export type UpdateEquipmentRecordInput = CreateEquipmentRecordInput;

export async function listEquipments(client: Supabase) {
  return client
    .from("equipments")
    .select(EQUIPMENT_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function listEquipmentsByIds(client: Supabase, ids: string[]) {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("equipments")
    .select(EQUIPMENT_COLUMNS)
    .in("id", ids);
}

export async function findEquipmentById(client: Supabase, id: string) {
  return client
    .from("equipments")
    .select(EQUIPMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createEquipment(
  client: Supabase,
  input: CreateEquipmentRecordInput
) {
  return client
    .from("equipments")
    .insert({
      name: input.name,
      description: input.description ?? null,
      quantity: input.quantity,
      unit_price: input.unit_price,
    })
    .select(EQUIPMENT_COLUMNS)
    .single();
}

export async function updateEquipment(
  client: Supabase,
  id: string,
  input: UpdateEquipmentRecordInput
) {
  return client
    .from("equipments")
    .update({
      name: input.name,
      description: input.description ?? null,
      quantity: input.quantity,
      unit_price: input.unit_price,
    })
    .eq("id", id)
    .select(EQUIPMENT_COLUMNS)
    .single();
}
