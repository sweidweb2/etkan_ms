import { ManageAccountingPanel } from "@/components/manager/accounting/manage-accounting-panel";
import { getSessionUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listMissingSppForOpenedPhases,
  listPaymentPhaseSemesterOptionsForManager,
  listPaymentPhasesForManager,
  listSppSemesterMismatchForManager,
  listStudentsBilledWithoutActiveClassForManager,
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
    billedWithoutClass,
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
    listStudentsBilledWithoutActiveClassForManager(adminClient, actorUserId),
  ]);

  const billedStudentIds = new Set(
    billedWithoutClass.map((row) => row.student_id)
  );
  const withoutClassOrPhase = studentsWithoutActiveClass.filter(
    (row) => !billedStudentIds.has(row.user_id)
  );

  return (
    <ManageAccountingPanel
      initialPhases={phases}
      initialMissing={missing}
      initialStudentsWithoutActiveClass={studentsWithoutActiveClass}
      initialWithoutClassOrPhase={withoutClassOrPhase}
      initialBilledWithoutClass={billedWithoutClass}
      initialSppSemesterMismatches={sppSemesterMismatches}
      semesterOptions={semesterOptions}
    />
  );
}
