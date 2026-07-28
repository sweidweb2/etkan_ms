import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type EmailDeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export type EmailUserRecord = Database["public"]["Tables"]["email_users"]["Row"];

export type UpsertEmailUserInput = {
  emailSentId: string;
  studentId: string | null;
  emailAddress: string;
  deliveryStatus: EmailDeliveryStatus;
  sentAt?: string | null;
  mailtrapMessageId?: string | null;
};

export async function upsertEmailUser(
  client: Supabase,
  input: UpsertEmailUserInput
) {
  return client.from("email_users").upsert(
    {
      email_sent_id: input.emailSentId,
      student_id: input.studentId,
      email_address: input.emailAddress,
      delivery_status: input.deliveryStatus,
      sent_at: input.sentAt ?? null,
      mailtrap_message_id: input.mailtrapMessageId ?? null,
    },
    { onConflict: "email_sent_id,email_address" }
  );
}

export async function insertEmailUsers(
  client: Supabase,
  rows: UpsertEmailUserInput[]
) {
  if (rows.length === 0) {
    return { data: [], error: null };
  }

  return client.from("email_users").upsert(
    rows.map((row) => ({
      email_sent_id: row.emailSentId,
      student_id: row.studentId,
      email_address: row.emailAddress,
      delivery_status: row.deliveryStatus,
      sent_at: row.sentAt ?? null,
      mailtrap_message_id: row.mailtrapMessageId ?? null,
    })),
    { onConflict: "email_sent_id,email_address" }
  );
}
