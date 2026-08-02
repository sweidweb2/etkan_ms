import { notFound } from "next/navigation";
import { WorkshopPaymentsPanel } from "@/components/manager/workshops/workshop-payments-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkshopPaymentsPageForManager } from "@/services/workshop.service";

type ManagerWorkshopPaymentsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerWorkshopPaymentsPage({
  params,
}: ManagerWorkshopPaymentsPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const page = await getWorkshopPaymentsPageForManager(
    adminClient,
    user?.id ?? null,
    id
  );

  if (!page) {
    notFound();
  }

  return (
    <WorkshopPaymentsPanel
      workshop={page.workshop}
      payments={page.payments}
      summary={page.summary}
    />
  );
}
