import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { loadEnvLocal } from "@/scripts/lib/load-env-local";

/** Service-role client for seed scripts (no `server-only` guard). */
export function createSeedAdminClient() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for seed scripts."
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
