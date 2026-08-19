import { ManageProjectsPanel } from "@/components/manager/projects/manage-projects-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listPublicProjectsForManager } from "@/services/public/public-project.service";

export default async function ManagerProjectsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const projects = await listPublicProjectsForManager(
    adminClient,
    user?.id ?? null
  );

  return <ManageProjectsPanel initialProjects={projects} />;
}
