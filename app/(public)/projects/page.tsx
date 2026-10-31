import type { Metadata } from "next";
import { ProjectsSection } from "@/components/public/projects-section";
import { JsonLd } from "@/components/seo/json-ld";
import { groupProjectsIntoPublicSections } from "@/lib/constants/public-projects";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PAGE_SEO } from "@/lib/seo/page-seo";
import { listPublicProjectsForPublic } from "@/services/public/public-project.service";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_SEO.projects.title,
  description: PAGE_SEO.projects.description,
  path: PAGE_SEO.projects.path,
});

export default async function ProjectsPage() {
  const projects = await listPublicProjectsForPublic();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: PAGE_SEO.home.path },
          { name: PAGE_SEO.projects.title, path: PAGE_SEO.projects.path },
        ])}
      />
      <ProjectsSection sections={groupProjectsIntoPublicSections(projects)} />
    </>
  );
}
