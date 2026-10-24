import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailDeliveryStatus } from "@/types/manager-emailing";
import type { Database } from "@/types/supabase";

export type { EmailDeliveryStatus };

type Supabase = SupabaseClient<Database>;

export type EmailUserRecord = Database["public"]["Tables"]["email_users"]["Row"];

export type UpsertEmailUserInput = {
  emailSentId: string;
  studentId: string | null;
  emailAddress: string;
  deliveryStatus: EmailDeliveryStatus;
  sentAt?: string | null;
  mailtrapMessageId?: string | null;
};

const EMAIL_USER_COLUMNS =
  "id, email_sent_id, student_id, email_address, sent_at, delivery_status, opened_at, mailtrap_message_id, created_at";

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

export async function listEmailUsersByEmailSentId(
  client: Supabase,
  emailSentId: string
) {
  return client
    .from("email_users")
    .select(EMAIL_USER_COLUMNS)
    .eq("email_sent_id", emailSentId)
    .order("created_at", { ascending: true });
}

export async function listEmailUserCountsByEmailSentIds(
  client: Supabase,
  emailSentIds: string[]
) {
  if (emailSentIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("email_users")
    .select("email_sent_id, delivery_status")
    .in("email_sent_id", emailSentIds);
}
