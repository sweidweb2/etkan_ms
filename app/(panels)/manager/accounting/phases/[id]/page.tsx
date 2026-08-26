import { notFound } from "next/navigation";
import { PaymentPhaseDetailsPanel } from "@/components/manager/accounting/payment-phase-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getPaymentPhaseForManager,
  listPaymentPhaseTransferOptionsForManager,
  listSppsForPhaseForManager,
} from "@/services/accounting/payment-phase.service";

type ManagerPaymentPhaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerPaymentPhaseDetailPage({
  params,
}: ManagerPaymentPhaseDetailPageProps) {
  const { id: phaseId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const [phase, spps, transferPhaseOptions] = await Promise.all([
    getPaymentPhaseForManager(adminClient, actorUserId, phaseId),
    listSppsForPhaseForManager(adminClient, actorUserId, phaseId),
    listPaymentPhaseTransferOptionsForManager(adminClient, actorUserId),
  ]);

  if (!phase) {
    notFound();
  }

  return (
    <PaymentPhaseDetailsPanel
      phase={phase}
      initialSpps={spps}
      transferPhaseOptions={transferPhaseOptions}
    />
  );
}
