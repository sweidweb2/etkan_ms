import { notFound } from "next/navigation";
import { StudentSppDetailsPanel } from "@/components/student/accounting/student-spp-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdjustmentForSppForSelf } from "@/services/accounting/student-financial-adjustment.service";
import {
  getSppDetailForSelf,
  listPaymentsForSppForSelf,
} from "@/services/accounting/student-payment.service";
import { listStudentPaymentSchedulesForSelf } from "@/services/accounting/student-payment-schedule.service";

type StudentSppDetailPageProps = {
  params: Promise<{ sppId: string }>;
};

export default async function StudentSppDetailPage({
  params,
}: StudentSppDetailPageProps) {
  const { sppId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const spp = await getSppDetailForSelf(adminClient, actorUserId, sppId);

  if (!spp) {
    notFound();
  }

  const [payments, schedules, adjustment] = await Promise.all([
    listPaymentsForSppForSelf(adminClient, actorUserId, sppId),
    listStudentPaymentSchedulesForSelf(adminClient, actorUserId, sppId),
    getAdjustmentForSppForSelf(adminClient, actorUserId, sppId),
  ]);

  return (
    <StudentSppDetailsPanel
      spp={spp}
      payments={payments}
      schedules={schedules}
      adjustment={adjustment}
    />
  );
}
