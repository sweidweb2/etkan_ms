import { notFound } from "next/navigation";
import { PaymentPhaseDetailsPanel } from "@/components/manager/accounting/payment-phase-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getPaymentPhaseForManager,
  listSppsForPhaseForManager,
} from "@/services/payment-phase.service";

type ManagerPaymentPhaseDetailPageProps = {
  params: Promise<{ phaseId: string }>;
};

export default async function ManagerPaymentPhaseDetailPage({
  params,
}: ManagerPaymentPhaseDetailPageProps) {
  const { phaseId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const phase = await getPaymentPhaseForManager(
    adminClient,
    actorUserId,
    phaseId
  );

  if (!phase) {
    notFound();
  }

  const spps = await listSppsForPhaseForManager(
    adminClient,
    actorUserId,
    phaseId
  );

  return <PaymentPhaseDetailsPanel phase={phase} initialSpps={spps} />;
}
