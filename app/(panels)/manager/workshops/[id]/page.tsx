import { notFound } from "next/navigation";
import { WorkshopDetailsPanel } from "@/components/manager/workshops/workshop-details-panel";
import { getSessionPack } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkshopForManager } from "@/services/workshops/workshop.service";

type ManagerWorkshopDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerWorkshopDetailPage({
  params,
}: ManagerWorkshopDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();
  const detail = await getWorkshopForManager(
    adminClient,
    pack.user?.id ?? null,
    id,
    pack.role
  );

  if (!detail) {
    notFound();
  }

  return (
    <WorkshopDetailsPanel
      workshop={detail.workshop}
      paymentCount={detail.payment_count}
      instructors={detail.instructors}
      documents={detail.documents}
      sessions={detail.sessions}
    />
  );
}
