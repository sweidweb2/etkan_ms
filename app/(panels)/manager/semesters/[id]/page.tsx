import { notFound } from "next/navigation";
import { SemesterDetailsPanel } from "@/components/manager/phases/semester-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSemesterForManager,
  listSemesterClassesForManager,
  listSemesterPaymentPhasesForManager,
} from "@/services/classes/semester.service";

type ManagerSemesterDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerSemesterDetailPage({
  params,
}: ManagerSemesterDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const semester = await getSemesterForManager(adminClient, user?.id ?? null, id);

  if (!semester) {
    notFound();
  }

  const [classes, paymentPhases] = await Promise.all([
    listSemesterClassesForManager(adminClient, user?.id ?? null, id),
    listSemesterPaymentPhasesForManager(adminClient, user?.id ?? null, id),
  ]);

  return (
    <SemesterDetailsPanel
      semester={semester}
      initialClasses={classes}
      initialPaymentPhases={paymentPhases}
    />
  );
}
