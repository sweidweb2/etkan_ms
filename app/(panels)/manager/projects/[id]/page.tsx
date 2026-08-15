import { notFound } from "next/navigation";
import { ProjectDetailsPanel } from "@/components/manager/projects/project-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPublicProjectForManager } from "@/services/public-project.service";

type ManagerProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerProjectDetailPage({
  params,
}: ManagerProjectDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const project = await getPublicProjectForManager(
    adminClient,
    user?.id ?? null,
    id
  );

  if (!project) {
    notFound();
  }

  return <ProjectDetailsPanel project={project} />;
}
