import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type EmailSentRecord = Database["public"]["Tables"]["email_sent"]["Row"];

export type CreateEmailSentInput = {
  title: string;
  body: string;
  locale: "en" | "ar";
  templateId: string;
  createdBy: string | null;
  year?: number;
};

const EMAIL_SENT_COLUMNS =
  "id, reference_number, year, reference_code, title, body, locale, template_id, created_by, created_at, updated_at";

export async function createEmailSentWithReference(
  client: Supabase,
  input: CreateEmailSentInput
) {
  const { data, error } = await client.rpc("create_email_sent_with_reference", {
    p_title: input.title,
    p_body: input.body,
    p_locale: input.locale,
    p_template_id: input.templateId,
    p_created_by: input.createdBy,
    ...(input.year !== undefined ? { p_year: input.year } : {}),
  });

  return { data: data as EmailSentRecord | null, error };
}

export async function listEmailSent(client: Supabase) {
  return client
    .from("email_sent")
    .select(EMAIL_SENT_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function findEmailSentById(client: Supabase, id: string) {
  return client
    .from("email_sent")
    .select(EMAIL_SENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}
