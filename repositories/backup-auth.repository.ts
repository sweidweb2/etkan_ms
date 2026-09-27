import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function exportAuthSchemaBackup(client: Supabase): Promise<{
  data: Json | null;
  error: { message: string } | null;
}> {
  const { data, error } = await client.rpc("export_auth_schema_backup");

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data ?? null, error: null };
}
