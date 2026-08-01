import { notFound } from "next/navigation";
import { PaymentPhaseDetailsPanel } from "@/components/manager/accounting/payment-phase-details-panel";
import { getSessionAuditActor, getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getPaymentPhaseForManager,
  listPaymentPhasesForManager,
  listSppsForPhaseForManager,
} from "@/services/payment-phase.service";

type ManagerPaymentPhaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerPaymentPhaseDetailPage({
  params,
}: ManagerPaymentPhaseDetailPageProps) {
  const { id: phaseId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actor = await getSessionAuditActor();
  const actorUserId = user?.id ?? null;

  const phase = await getPaymentPhaseForManager(
    adminClient,
    actorUserId,
    phaseId
  );

  if (!phase) {
    notFound();
  }

  const [spps, transferPhaseOptions] = await Promise.all([
    listSppsForPhaseForManager(adminClient, actorUserId, phaseId),
    listPaymentPhasesForManager(adminClient, actorUserId),
  ]);

  return (
    <PaymentPhaseDetailsPanel
      phase={phase}
      initialSpps={spps}
      transferPhaseOptions={transferPhaseOptions}
      actorLabel={actor.userLabel || "Manager"}
    />
  );
}
