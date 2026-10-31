import type { FieldErrors } from "@/types/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type Supabase = SupabaseClient<Database>;

export type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};
