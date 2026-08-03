import { notFound } from "next/navigation";
import { WorkshopDetailsPanel } from "@/components/manager/workshops/workshop-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkshopForManager } from "@/services/workshop.service";

type ManagerWorkshopDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerWorkshopDetailPage({
  params,
}: ManagerWorkshopDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const detail = await getWorkshopForManager(
    adminClient,
    user?.id ?? null,
    id
  );

  if (!detail) {
    notFound();
  }

  return (
    <WorkshopDetailsPanel
      workshop={detail.workshop}
      paymentCount={detail.payment_count}
      instructors={detail.instructors}
      instructorCandidates={detail.instructorCandidates}
      documents={detail.documents}
      scheduleSlots={detail.scheduleSlots}
    />
  );
}
