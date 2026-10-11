import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient<Database> | null = null;

/** Lazy browser client so Realtime is created in the browser, not during SSR. */
export function getBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
