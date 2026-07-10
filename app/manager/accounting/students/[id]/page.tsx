import { notFound } from "next/navigation";
import { StudentAccountDetailsPanel } from "@/components/manager/accounting/student-account-details-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStudentAccountForManager } from "@/services/accounting.service";

type ManagerStudentAccountDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerStudentAccountDetailPage({
  params,
}: ManagerStudentAccountDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const accountDetails = await getStudentAccountForManager(
    adminClient,
    role,
    id
  );

  if (!accountDetails) {
    notFound();
  }

  return <StudentAccountDetailsPanel accountDetails={accountDetails} />;
}
