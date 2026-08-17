import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const INVITE_COLUMNS =
  "id, guest_id, token, application_id, created_by, created_at, used_at, cancelled_at";

export type GuestRegistrationInviteRecord = {
  id: string;
  guest_id: string;
  token: string;
  application_id: string | null;
  created_by: string | null;
  created_at: string;
  used_at: string | null;
  cancelled_at: string | null;
};

export type CreateGuestRegistrationInviteInput = {
  guest_id: string;
  token: string;
  created_by: string | null;
};

export type ResetGuestRegistrationInviteInput = {
  token: string;
  created_by: string | null;
  application_id?: null;
  used_at?: null;
  cancelled_at?: null;
};

export async function findInviteByGuestId(client: Supabase, guestId: string) {
  return client
    .from("guest_registration_invites")
    .select(INVITE_COLUMNS)
    .eq("guest_id", guestId)
    .maybeSingle();
}

export async function findInviteByToken(client: Supabase, token: string) {
  return client
    .from("guest_registration_invites")
    .select(INVITE_COLUMNS)
    .eq("token", token)
    .maybeSingle();
}

export async function createInvite(
  client: Supabase,
  input: CreateGuestRegistrationInviteInput
) {
  return client
    .from("guest_registration_invites")
    .insert({
      guest_id: input.guest_id,
      token: input.token,
      created_by: input.created_by,
    })
    .select(INVITE_COLUMNS)
    .single();
}

export async function updateInvite(
  client: Supabase,
  inviteId: string,
  input: ResetGuestRegistrationInviteInput
) {
  return client
    .from("guest_registration_invites")
    .update({
      token: input.token,
      created_by: input.created_by,
      application_id: input.application_id ?? null,
      used_at: input.used_at ?? null,
      cancelled_at: input.cancelled_at ?? null,
    })
    .eq("id", inviteId)
    .select(INVITE_COLUMNS)
    .single();
}

export async function stopInvite(
  client: Supabase,
  inviteId: string,
  cancelledAt: string
) {
  return client
    .from("guest_registration_invites")
    .update({ cancelled_at: cancelledAt })
    .eq("id", inviteId)
    .is("cancelled_at", null)
    .select(INVITE_COLUMNS)
    .maybeSingle();
}

export async function markInviteUsed(
  client: Supabase,
  inviteId: string,
  applicationId: string,
  usedAt: string
) {
  return client
    .from("guest_registration_invites")
    .update({
      used_at: usedAt,
      application_id: applicationId,
    })
    .eq("id", inviteId)
    .is("used_at", null)
    .is("cancelled_at", null)
    .select(INVITE_COLUMNS)
    .maybeSingle();
}

export async function clearInviteApplicationId(
  client: Supabase,
  inviteId: string
) {
  return client
    .from("guest_registration_invites")
    .update({ application_id: null })
    .eq("id", inviteId)
    .select(INVITE_COLUMNS)
    .single();
}
