import { notFound } from "next/navigation";
import { UserDetailsPanel } from "@/components/manager/users/user-details-panel";
import { getSessionPack } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserForManagerById } from "@/services/auth/user.service";

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

  return <UserDetailsPanel user={user} />;
}
