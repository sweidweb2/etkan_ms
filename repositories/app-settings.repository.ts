import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SETTINGS_ROW_ID = 1;

export async function getMaintenanceMode(
  client: Supabase
): Promise<boolean> {
  try {
    const { data, error } = await client
      .from("app_settings")
      .select("maintenance_mode")
      .eq("id", SETTINGS_ROW_ID)
      .maybeSingle();

    if (error || !data) return false;
    return data.maintenance_mode ?? false;
  } catch {
    // If migrations haven't run yet, fail safe (no maintenance mode).
    return false;
  }
}

export async function setMaintenanceMode(
  client: Supabase,
  enabled: boolean
): Promise<void> {
  const { error } = await client
    .from("app_settings")
    .upsert({
      id: SETTINGS_ROW_ID,
      maintenance_mode: enabled,
    });

  if (error) {
    throw new Error(error.message);
  }
}

