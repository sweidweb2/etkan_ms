import { notFound } from "next/navigation";
import { GuestDetailsPanel } from "@/components/manager/guests/guest-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getGuestDetailForManager } from "@/services/guest.service";

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

  return (
    <GuestDetailsPanel
      guest={detail.guest}
      statusEvents={detail.statusEvents}
      registrationInvite={detail.registrationInvite}
      registrationApplication={detail.registrationApplication}
    />
  );
}
