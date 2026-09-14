import { notFound } from "next/navigation";
import { UserDetailsPanel } from "@/components/manager/users/user-details-panel";
import { getSessionPack } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserForManagerById } from "@/services/auth/user.service";
import { getUserAccessBreakdown } from "@/services/auth/user-permissions.service";

type ManagerUserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerUserDetailPage({
  params,
}: ManagerUserDetailPageProps) {
  const { id } = await params;
  const pack = await getSessionPack();
  const adminClient = createSupabaseAdminClient();

  const user = await getUserForManagerById(
    adminClient,
    pack.user?.id ?? null,
    id
  );

  if (!user) {
    notFound();
  }

  const canManageOverlays =
    pack.role === ROLES.MANAGER &&
    pack.permissions.has(PERMISSIONS.RBAC_MANAGE);

  let initialBreakdown = null;
  if (canManageOverlays) {
    const breakdown = await getUserAccessBreakdown(
      adminClient,
      pack.user?.id ?? null,
      id
    );
    if (!("error" in breakdown)) {
      initialBreakdown = breakdown;
    }
  }

  return (
    <UserDetailsPanel
      user={user}
      canManageOverlays={canManageOverlays}
      initialBreakdown={initialBreakdown}
    />
  );
}
