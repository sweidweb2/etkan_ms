import * as registrationRepository from "@/repositories/student-registration-application.repository";
import type { ManagerGuestRow } from "@/types/manager-guest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/** Fills `email` from the newest non-cancelled registration application per guest. */
export async function attachGuestRegistrationEmails(
  client: Supabase,
  guests: ManagerGuestRow[]
): Promise<ManagerGuestRow[]> {
  if (guests.length === 0) {
    return guests;
  }

  const { data, error } = await registrationRepository.listActiveEmailsByGuestIds(
    client,
    guests.map((guest) => guest.id)
  );

  if (error) {
    throw new Error(error.message);
  }

  const emailByGuestId = new Map<string, string>();
  for (const row of data ?? []) {
    if (!row.guest_id || emailByGuestId.has(row.guest_id)) {
      continue;
    }
    emailByGuestId.set(row.guest_id, row.email);
  }

  return guests.map((guest) => ({
    ...guest,
    email: emailByGuestId.get(guest.id) ?? null,
  }));
}
