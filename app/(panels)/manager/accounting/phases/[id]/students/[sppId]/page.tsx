import { notFound } from "next/navigation";
import { SppDetailsPanel } from "@/components/manager/accounting/spp-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { getRequestAdminClient } from "@/lib/supabase/admin";
import {
  getAdjustmentForSppForManager,
  listFormsForSppForManager,
  listImportableAdjustmentsForManager,
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
  const adminClient = getRequestAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const sppPromise = getSppDetailForManager(
    adminClient,
    actorUserId,
    phaseId,
    sppId
  );
  const importablePromise = sppPromise.then((spp) =>
    spp
      ? listImportableAdjustmentsForManager(
          adminClient,
          actorUserId,
          spp.student_id,
          spp.id
        )
      : []
  );

  const [
    spp,
    payments,
    schedules,
    adjustment,
    importableAdjustments,
    forms,
    invites,
  ] = await Promise.all([
    sppPromise,
    listPaymentsForSppForManager(adminClient, actorUserId, sppId),
    listStudentPaymentSchedulesForManager(adminClient, actorUserId, sppId),
    getAdjustmentForSppForManager(adminClient, actorUserId, sppId),
    importablePromise,
    listFormsForSppForManager(adminClient, actorUserId, sppId),
    listInvitesForSppForManager(adminClient, actorUserId, sppId),
  ]);

  if (!spp) {
    notFound();
  }

  return (
    <SppDetailsPanel
      spp={spp}
      initialPayments={payments}
      initialSchedules={schedules}
      initialAdjustment={adjustment}
      initialImportableAdjustments={importableAdjustments}
      initialForms={forms}
      initialInvites={invites}
    />
  );
}
