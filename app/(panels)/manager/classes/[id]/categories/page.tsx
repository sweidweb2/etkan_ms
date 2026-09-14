import { notFound } from "next/navigation";
import { ClassFollowUpPanel } from "@/components/manager/classes/follow-up/class-follow-up-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClassFollowUpForManager } from "@/services/classes/class-follow-up.service";

type ManagerClassCategoriesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerClassCategoriesPage({
  params,
}: ManagerClassCategoriesPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const payload = await getClassFollowUpForManager(
    adminClient,
    user?.id ?? null,
    id
  );

  if (!payload) {
    notFound();
  }

  return (
    <ClassFollowUpPanel
      classRow={payload.classRow}
      categories={payload.categories}
      board={payload.board}
    />
  );
}
