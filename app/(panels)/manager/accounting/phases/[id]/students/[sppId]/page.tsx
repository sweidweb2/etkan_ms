import { notFound } from "next/navigation";
import { SppDetailsPanel } from "@/components/manager/accounting/spp-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAdjustmentForSppForManager,
  listFormsForSppForManager,
  listInvitesForSppForManager,
} from "@/services/accounting/student-financial-adjustment.service";
import {
  getSppDetailForManager,
  listPaymentsForSppForManager,
} from "@/services/accounting/student-payment.service";
import { listStudentPaymentSchedulesForManager } from "@/services/accounting/student-payment-schedule.service";

type ManagerSppDetailPageProps = {
  params: Promise<{ id: string; sppId: string }>;
};

export default async function ManagerSppDetailPage({
  params,
}: ManagerSppDetailPageProps) {
  const { id: phaseId, sppId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
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

  const [payments, schedules, adjustment, forms, invites] = await Promise.all([
    listPaymentsForSppForManager(adminClient, actorUserId, sppId),
    listStudentPaymentSchedulesForManager(adminClient, actorUserId, sppId),
    getAdjustmentForSppForManager(adminClient, actorUserId, sppId),
    listFormsForSppForManager(adminClient, actorUserId, sppId),
    listInvitesForSppForManager(adminClient, actorUserId, sppId),
  ]);

  return (
    <SppDetailsPanel
      spp={spp}
      initialPayments={payments}
      initialSchedules={schedules}
      initialAdjustment={adjustment}
      initialForms={forms}
      initialInvites={invites}
    />
  );
}
