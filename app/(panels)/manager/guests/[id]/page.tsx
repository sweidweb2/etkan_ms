import { notFound } from "next/navigation";
import { GuestDetailsPanel } from "@/components/manager/guests/guest-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getGuestDetailForManager } from "@/services/guests/guest.service";
import { getGuestRegistrationLinkUserOption } from "@/services/guests/guest-registration.service";

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

  const linkedUserId = detail.registrationApplication?.user_id ?? null;
  const linkedUser = linkedUserId
    ? await timer.step("linkedUser", () =>
        getGuestRegistrationLinkUserOption(adminClient, linkedUserId)
      )
    : null;
  timer.end();

  return (
    <GuestDetailsPanel
      guest={detail.guest}
      statusEvents={detail.statusEvents}
      registrationInvite={detail.registrationInvite}
      registrationApplication={detail.registrationApplication}
      linkedUser={linkedUser}
    />
  );
}
