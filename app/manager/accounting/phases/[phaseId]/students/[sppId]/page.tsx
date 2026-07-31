import { notFound } from "next/navigation";
import { SppDetailsPanel } from "@/components/manager/accounting/spp-details-panel";
import { getSessionAuditActor, getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSppDetailForManager,
  listPaymentsForSppForManager,
} from "@/services/student-payment.service";

type ManagerSppDetailPageProps = {
  params: Promise<{ phaseId: string; sppId: string }>;
};

export default async function ManagerSppDetailPage({
  params,
}: ManagerSppDetailPageProps) {
  const { phaseId, sppId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actor = await getSessionAuditActor();
  const actorUserId = user?.id ?? null;

  const spp = await getSppDetailForManager(
    adminClient,
    actorUserId,
    phaseId,
    sppId
  );

  if (!spp) {
    notFound();
  }

  const payments = await listPaymentsForSppForManager(
    adminClient,
    actorUserId,
    sppId
  );

  return (
    <SppDetailsPanel
      spp={spp}
      initialPayments={payments}
      actorLabel={actor.userLabel || "Manager"}
    />
  );
}
