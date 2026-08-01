import { ManageAccountingPanel } from "@/components/manager/accounting/manage-accounting-panel";
import { getSessionUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listMissingSppForOpenedPhases,
  listPaymentPhaseSemesterOptionsForManager,
  listPaymentPhasesForManager,
  listSppSemesterMismatchForManager,
} from "@/services/payment-phase.service";
import { listStudentsWithoutInProgressClassForManager } from "@/services/student.service";

export default async function ManagerAccountingPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const [
    phases,
    missing,
    semesterOptions,
    studentsWithoutActiveClass,
    sppSemesterMismatches,
  ] = await Promise.all([
    listPaymentPhasesForManager(adminClient, actorUserId),
    listMissingSppForOpenedPhases(adminClient, actorUserId),
    listPaymentPhaseSemesterOptionsForManager(adminClient, actorUserId),
    listStudentsWithoutInProgressClassForManager(
      adminClient,
      actorUserId,
      PERMISSIONS.ACCOUNTING_VIEW
    ),
    listSppSemesterMismatchForManager(adminClient, actorUserId),
  ]);

  return (
    <ManageAccountingPanel
      initialPhases={phases}
      initialMissing={missing}
      initialStudentsWithoutActiveClass={studentsWithoutActiveClass}
      initialSppSemesterMismatches={sppSemesterMismatches}
      semesterOptions={semesterOptions}
    />
  );
}
