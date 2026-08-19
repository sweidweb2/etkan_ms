import { notFound } from "next/navigation";
import { GuestDetailsPanel } from "@/components/manager/guests/guest-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
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
  const timer = createNavStepTimer("guest_detail");
  const user = await timer.step("session", () => getSessionUser());
  const detail = await timer.step("detail", () =>
    getGuestDetailForManager(adminClient, user?.id ?? null, id)
  );

  if (!detail) {
    timer.end();
    notFound();
  }

  const linkUsers = await timer.step("linkUsers", () =>
    listUsersForGuestRegistrationLink(adminClient, user?.id ?? null)
  );
  timer.end();

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
