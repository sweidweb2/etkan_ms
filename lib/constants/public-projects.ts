import type { MessageKey } from "@/lib/i18n/messages";

export const PROJECT_SECTION_IDS = [
  "students",
  "teachers",
  "etkan",
] as const;

export type ProjectSectionId = (typeof PROJECT_SECTION_IDS)[number];

export type PublicProjectCard = {
  id: string;
  title: string;
  body: string;
  imageSrc: string;
  category: string;
  author?: string | null;
  href?: string | null;
};

export type PublicProjectSection = {
  id: ProjectSectionId;
  titleKey: MessageKey;
  leadKey: MessageKey;
  emptyKey: MessageKey;
  projects: PublicProjectCard[];
};

export type PublicProjectListItem = {
  id: string;
  classification: string;
  category: string;
  title: string;
  body: string;
  author: string | null;
  image_url: string;
  href: string | null;
  created_at: string;
};

export const PUBLIC_PROJECT_SECTION_META: Omit<
  PublicProjectSection,
  "projects"
>[] = [
  {
    id: "students",
    titleKey: "projects.section.students.title",
    leadKey: "projects.section.students.lead",
    emptyKey: "projects.section.empty",
  },
  {
    id: "teachers",
    titleKey: "projects.section.teachers.title",
    leadKey: "projects.section.teachers.lead",
    emptyKey: "projects.section.empty",
  },
  {
    id: "etkan",
    titleKey: "projects.section.etkan.title",
    leadKey: "projects.section.etkan.lead",
    emptyKey: "projects.section.empty",
  },
];

export function groupProjectsIntoPublicSections(
  projects: PublicProjectListItem[]
): PublicProjectSection[] {
  return PUBLIC_PROJECT_SECTION_META.map((section) => ({
    ...section,
    projects: projects
      .filter((project) => project.classification === section.id)
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((project) => ({
        id: project.id,
        title: project.title,
        body: project.body,
        imageSrc: project.image_url,
        category: project.category,
        author: project.author,
        href: project.href,
      })),
  }));
}
