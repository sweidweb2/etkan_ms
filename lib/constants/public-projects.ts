import type { MessageKey } from "@/lib/i18n/messages";

export const PROJECT_SECTION_IDS = [
  "students",
  "teachers",
  "etkan",
] as const;

export type ProjectSectionId = (typeof PROJECT_SECTION_IDS)[number];

/** Category filters shared by every projects section (more can be added later). */
export const PROJECT_CATEGORIES = [
  "all",
  "webApp",
  "mobileApps",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export type PublicProjectCardCategory = Exclude<ProjectCategory, "all">;

export type PublicProjectCard = {
  id: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  imageAltKey: MessageKey;
  imageSrc: string;
  category: PublicProjectCardCategory;
  href?: string;
};

export type PublicProjectSection = {
  id: ProjectSectionId;
  titleKey: MessageKey;
  leadKey: MessageKey;
  emptyKey: MessageKey;
  projects: PublicProjectCard[];
};

export const PROJECT_CATEGORY_LABEL_KEYS = {
  all: "projects.filter.all",
  webApp: "projects.filter.webApp",
  mobileApps: "projects.filter.mobileApps",
} as const satisfies Record<ProjectCategory, MessageKey>;

export const PUBLIC_PROJECT_SECTIONS: PublicProjectSection[] = [
  {
    id: "students",
    titleKey: "projects.section.students.title",
    leadKey: "projects.section.students.lead",
    emptyKey: "projects.section.empty",
    projects: [],
  },
  {
    id: "teachers",
    titleKey: "projects.section.teachers.title",
    leadKey: "projects.section.teachers.lead",
    emptyKey: "projects.section.empty",
    projects: [
      {
        id: "etkan-ms",
        titleKey: "projects.teachers.etkanMs.title",
        bodyKey: "projects.teachers.etkanMs.body",
        imageAltKey: "projects.teachers.etkanMs.imageAlt",
        imageSrc:
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=900&auto=format&fit=crop",
        category: "webApp",
        href: "/",
      },
    ],
  },
  {
    id: "etkan",
    titleKey: "projects.section.etkan.title",
    leadKey: "projects.section.etkan.lead",
    emptyKey: "projects.section.empty",
    projects: [
      {
        id: "tap2eat",
        titleKey: "projects.teachers.tap2eat.title",
        bodyKey: "projects.teachers.tap2eat.body",
        imageAltKey: "projects.teachers.tap2eat.imageAlt",
        imageSrc:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=900&auto=format&fit=crop",
        category: "webApp",
        href: "https://tap2eat.food",
      },
      {
        id: "3dbey",
        titleKey: "projects.teachers.3dbey.title",
        bodyKey: "projects.teachers.3dbey.body",
        imageAltKey: "projects.teachers.3dbey.imageAlt",
        imageSrc:
          "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=900&auto=format&fit=crop",
        category: "webApp",
        href: "https://3dbey.com",
      },
    ],
  },
];
