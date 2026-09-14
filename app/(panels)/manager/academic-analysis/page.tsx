import { redirect } from "next/navigation";
import { AcademicAnalysisPanel } from "@/components/manager/academic/academic-analysis-panel";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAcademicAnalysisForManager } from "@/services/academic/academic-analysis.service";

export default async function ManagerAcademicAnalysisPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const data = await getAcademicAnalysisForManager(adminClient, user.id);

  return <AcademicAnalysisPanel data={data} />;
}
