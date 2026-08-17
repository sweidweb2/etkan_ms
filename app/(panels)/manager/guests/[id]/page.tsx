import { notFound } from "next/navigation";
import { GuestDetailsPanel } from "@/components/manager/guests/guest-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getGuestDetailForManager } from "@/services/guest.service";
import { listUsersForGuestRegistrationLink } from "@/services/guest-registration.service";

type ManagerGuestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerGuestDetailPage({
  params,
}: ManagerGuestDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const detail = await getGuestDetailForManager(
    adminClient,
    user?.id ?? null,
    id
  );

  if (!detail) {
    notFound();
  }

  const linkUsers = await listUsersForGuestRegistrationLink(
    adminClient,
    user?.id ?? null
  );

  return (
    <GuestDetailsPanel
      guest={detail.guest}
      statusEvents={detail.statusEvents}
      registrationInvite={detail.registrationInvite}
      registrationApplication={detail.registrationApplication}
      linkUsers={linkUsers}
    />
  );
}
