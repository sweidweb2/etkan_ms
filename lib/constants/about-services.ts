import { ROUTES } from "@/lib/constants/routes";
import type { MessageKey } from "@/lib/i18n/messages";

/** Careers tab query values (note: roadmap is singular on Careers). */
export type CareersTabId = "roadmap" | "workshops" | "online";

export const CAREERS_TAB_IDS = [
  "roadmap",
  "workshops",
  "online",
] as const satisfies readonly CareersTabId[];

export function isCareersTabId(value: string): value is CareersTabId {
  return (CAREERS_TAB_IDS as readonly string[]).includes(value);
}

export const ABOUT_FOUNDATION_IDS = [
  "breeding",
  "education",
  "production",
] as const;

export type AboutFoundationId = (typeof ABOUT_FOUNDATION_IDS)[number];

export type AboutFoundation = {
  id: AboutFoundationId;
  featured: true;
  href: string;
  imageSrc: string;
  tagKeys: MessageKey[];
  clientKey: MessageKey;
  headlineKey: MessageKey;
  summaryKey: MessageKey;
  imageAltKey: MessageKey;
  stat: {
    valueKey: MessageKey;
    unitKey: MessageKey;
  };
};

export const ABOUT_FOUNDATIONS: AboutFoundation[] = [
  {
    id: "breeding",
    featured: true,
    href: ROUTES.CAREERS,
    imageSrc:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=900&auto=format&fit=crop",
    tagKeys: [
      "about.services.breeding.tag1",
      "about.services.breeding.tag2",
    ],
    clientKey: "about.services.breeding.label",
    headlineKey: "about.services.breeding.headline",
    summaryKey: "about.services.breeding.summary",
    imageAltKey: "about.services.breeding.imageAlt",
    stat: {
      valueKey: "about.services.breeding.stat.value",
      unitKey: "about.services.breeding.stat.unit",
    },
  },
  {
    id: "education",
    featured: true,
    href: ROUTES.CAREERS,
    imageSrc:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=900&auto=format&fit=crop",
    tagKeys: [
      "about.services.education.tag1",
      "about.services.education.tag2",
    ],
    clientKey: "about.services.education.label",
    headlineKey: "about.services.education.headline",
    summaryKey: "about.services.education.summary",
    imageAltKey: "about.services.education.imageAlt",
    stat: {
      valueKey: "about.services.education.stat.value",
      unitKey: "about.services.education.stat.unit",
    },
  },
  {
    id: "production",
    featured: true,
    href: ROUTES.PROJECTS,
    imageSrc:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=900&auto=format&fit=crop",
    tagKeys: [
      "about.services.production.tag1",
      "about.services.production.tag2",
    ],
    clientKey: "about.services.production.label",
    headlineKey: "about.services.production.headline",
    summaryKey: "about.services.production.summary",
    imageAltKey: "about.services.production.imageAlt",
    stat: {
      valueKey: "about.services.production.stat.value",
      unitKey: "about.services.production.stat.unit",
    },
  },
];

export const FEATURED_ABOUT_FOUNDATIONS = ABOUT_FOUNDATIONS.filter(
  (item) => item.featured
);
