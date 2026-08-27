import { ProjectsSection } from "@/components/public/projects-section";
import { groupProjectsIntoPublicSections } from "@/lib/constants/public-projects";
import { listPublicProjectsForPublic } from "@/services/public/public-project.service";

export default async function ProjectsPage() {
  const projects = await listPublicProjectsForPublic();

  return (
    <ProjectsSection sections={groupProjectsIntoPublicSections(projects)} />
  );
}
