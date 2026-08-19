import { ProjectsSection } from "@/components/public/projects-section";
import { groupProjectsIntoPublicSections } from "@/lib/constants/public-projects";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listPublicProjectsForPublic } from "@/services/public/public-project.service";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const adminClient = createSupabaseAdminClient();
  const projects = await listPublicProjectsForPublic(adminClient);

  return (
    <ProjectsSection sections={groupProjectsIntoPublicSections(projects)} />
  );
}
