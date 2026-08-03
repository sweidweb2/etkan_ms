import { notFound } from "next/navigation";
import { SppDetailsPanel } from "@/components/manager/accounting/spp-details-panel";
import { getSessionAuditActor, getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdjustmentForSppForManager } from "@/services/student-financial-adjustment.service";
import {
  getSppDetailForManager,
  listPaymentsForSppForManager,
} from "@/services/student-payment.service";

type ManagerSppDetailPageProps = {
  params: Promise<{ id: string; sppId: string }>;
};

export default async function ManagerSppDetailPage({
  params,
}: ManagerSppDetailPageProps) {
  const { id: phaseId, sppId } = await params;
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

  const [payments, adjustment] = await Promise.all([
    listPaymentsForSppForManager(adminClient, actorUserId, sppId),
    getAdjustmentForSppForManager(adminClient, actorUserId, sppId),
  ]);

  return (
    <SppDetailsPanel
      spp={spp}
      initialPayments={payments}
      initialAdjustment={adjustment}
      actorLabel={actor.userLabel || "Manager"}
    />
  );
}
