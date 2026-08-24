import { BORROW_EQUIPMENT_STATUSES } from "@/lib/constants/manager-borrow-equipment-status";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const BORROW_COLUMNS =
  "id, equipment_id, user_id, quantity, borrowed_at, returned_at, status";

export type BorrowEquipmentRecord = {
  id: string;
  equipment_id: string;
  user_id: string;
  quantity: number | null;
  borrowed_at: string | null;
  returned_at: string | null;
  status: string | null;
};

export async function listActiveBorrowQuantitiesByEquipmentIds(
  client: Supabase,
  equipmentIds: string[]
) {
  if (equipmentIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("borrow_equipment")
    .select("equipment_id, quantity")
    .eq("status", BORROW_EQUIPMENT_STATUSES.BORROWED)
    .in("equipment_id", equipmentIds);
}

export async function listBorrowsByEquipmentId(
  client: Supabase,
  equipmentId: string
) {
  return client
    .from("borrow_equipment")
    .select(BORROW_COLUMNS)
    .eq("equipment_id", equipmentId)
    .order("borrowed_at", { ascending: false });
}

export async function listBorrowsByUserId(client: Supabase, userId: string) {
  return client
    .from("borrow_equipment")
    .select(BORROW_COLUMNS)
    .eq("user_id", userId)
    .order("borrowed_at", { ascending: false });
}

export async function listAllBorrows(client: Supabase) {
  return client
    .from("borrow_equipment")
    .select(BORROW_COLUMNS)
    .order("borrowed_at", { ascending: false });
}

export async function listBorrowsPage(
  client: Supabase,
  options: { offset: number; limit: number }
) {
  const from = options.offset;
  const to = options.offset + options.limit - 1;

  return client
    .from("borrow_equipment")
    .select(BORROW_COLUMNS, { count: "exact" })
    .order("borrowed_at", { ascending: false })
    .range(from, to);
}

export type CreateBorrowRecordInput = {
  equipment_id: string;
  user_id: string;
  quantity: number;
  status?: string;
};

export async function createBorrows(
  client: Supabase,
  inputs: CreateBorrowRecordInput[]
) {
  return client
    .from("borrow_equipment")
    .insert(
      inputs.map((input) => ({
        equipment_id: input.equipment_id,
        user_id: input.user_id,
        quantity: input.quantity,
        status: input.status ?? BORROW_EQUIPMENT_STATUSES.BORROWED,
      }))
    )
    .select(BORROW_COLUMNS);
}

export async function getBorrowById(client: Supabase, id: string) {
  return client
    .from("borrow_equipment")
    .select(BORROW_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export type UpdateBorrowRecordInput = {
  quantity: number;
  status: string;
  returned_at: string | null;
};

export async function updateBorrowRecord(
  client: Supabase,
  id: string,
  input: UpdateBorrowRecordInput
) {
  return client
    .from("borrow_equipment")
    .update({
      quantity: input.quantity,
      status: input.status,
      returned_at: input.returned_at,
    })
    .eq("id", id)
    .select(BORROW_COLUMNS)
    .single();
}
