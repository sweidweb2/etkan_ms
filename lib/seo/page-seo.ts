import { SITE } from "@/lib/config/site";
import type { CareersRoadmapStageId } from "@/lib/constants/careers-roadmaps";
import { ROUTES } from "@/lib/constants/routes";

export type PageSeoEntry = {
  path: string;
  title: string;
  description: string;
};

/** English SEO copy for indexable marketing pages (metadata + JSON-LD). */
export const PAGE_SEO = {
  home: {
    path: ROUTES.HOME,
    title: SITE.name,
    description: SITE.seoDescription,
  },
  about: {
    path: ROUTES.ABOUT,
    title: "About",
    description:
      "Learn about Etkan’s vision and mission: shape people through workshops, projects, and industrial practice, then deliver usable technology.",
  },
  careers: {
    path: ROUTES.CAREERS,
    title: "Careers & learning tracks",
    description:
      "Explore Etkan career roadmaps, workshops, and learning tracks—from foundations to specialized, project-ready skills.",
  },
  projects: {
    path: ROUTES.PROJECTS,
    title: "Projects",
    description:
      "See student, teacher, and Etkan projects—real builds that show how our learning path turns into shipped technology.",
  },
  gallery: {
    path: ROUTES.GALLERY,
    title: "Gallery",
    description:
      "Workshop life at Etkan—photos from training sessions, builds, labs, and team moments.",
  },
  blogs: {
    path: ROUTES.BLOGS,
    title: "Blogs",
    description:
      "Articles and insights from Etkan on learning, workshops, projects, and building technology with purpose.",
  },
  register: {
    path: ROUTES.REGISTER,
    title: "Register",
    description:
      "Apply to join Etkan’s learning path. Start your registration for workshops, projects, and career tracks.",
  },
} as const satisfies Record<string, PageSeoEntry>;

const ROADMAP_STAGE_SEO: Record<
  CareersRoadmapStageId,
  { title: string; description: string }
> = {
  "stage-1": {
    title: "Careers roadmap — Stage 1",
    description:
      "Stage 1 of the Etkan careers roadmap: foundations and the first steps on the learning path.",
  },
  "stage-2": {
    title: "Careers roadmap — Stage 2",
    description:
      "Stage 2 of the Etkan careers roadmap: build depth through guided practice and projects.",
  },
  "stage-3": {
    title: "Careers roadmap — Stage 3",
    description:
      "Stage 3 of the Etkan careers roadmap: specialize and strengthen applied technology skills.",
  },
  "stage-4": {
    title: "Careers roadmap — Stage 4",
    description:
      "Stage 4 of the Etkan careers roadmap: deliver real work with stronger ownership and craft.",
  },
  "stage-5": {
    title: "Careers roadmap — Stage 5",
    description:
      "Stage 5 of the Etkan careers roadmap: advanced practice toward professional readiness.",
  },
  "stage-6": {
    title: "Careers roadmap — Stage 6",
    description:
      "Stage 6 of the Etkan careers roadmap: capstone-level delivery and career-ready outcomes.",
  },
};

export function getCareersRoadmapPageSeo(id: CareersRoadmapStageId): PageSeoEntry {
  const entry = ROADMAP_STAGE_SEO[id];
  return {
    path: `/careers/roadmap/${id}`,
    title: entry.title,
    description: entry.description,
  };
}
