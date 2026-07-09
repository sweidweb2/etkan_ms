import { BORROW_EQUIPMENT_STATUSES } from "@/lib/constants/manager-borrow-equipment-status";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

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
