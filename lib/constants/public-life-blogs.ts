import type { MessageKey } from "@/lib/i18n/messages";

export const LIFE_BLOG_CATEGORIES = [
  "workshop",
  "students",
  "community",
  "projects",
  "events",
] as const;

export type LifeBlogCategory = (typeof LIFE_BLOG_CATEGORIES)[number];

export const LIFE_BLOG_FILTERS = ["all", ...LIFE_BLOG_CATEGORIES] as const;

export type LifeBlogFilter = (typeof LIFE_BLOG_FILTERS)[number];

export const LIFE_BLOG_CATEGORY_LABEL_KEYS = {
  workshop: "life.category.workshop",
  students: "life.category.students",
  community: "life.category.community",
  projects: "life.category.projects",
  events: "life.category.events",
} as const satisfies Record<LifeBlogCategory, MessageKey>;

export const LIFE_BLOG_FILTER_LABEL_KEYS = {
  all: "life.filter.all",
  ...LIFE_BLOG_CATEGORY_LABEL_KEYS,
} as const satisfies Record<LifeBlogFilter, MessageKey>;

export type FeaturedLifeBlog = {
  id: string;
  imageSrc: string;
  imageAltKey: MessageKey;
  titleKey: MessageKey;
  excerptKey: MessageKey;
  authorNameKey: MessageKey;
  authorInitials: string;
  publishedAt: string;
  categories: LifeBlogCategory[];
};

export type LifeBlogCard = {
  id: string;
  imageSrc: string;
  imageAltKey: MessageKey;
  titleKey: MessageKey;
  excerptKey: MessageKey;
  bodyKeys: MessageKey[];
  authorNameKey: MessageKey;
  authorInitials: string;
  publishedAt: string;
  category: LifeBlogCategory;
};

/** Placeholder featured posts for the Life page carousel — swap for real data later. */
export const FEATURED_LIFE_BLOGS: FeaturedLifeBlog[] = [
  {
    id: "1",
    imageSrc:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1600&auto=format&fit=crop",
    imageAltKey: "life.featured.1.imageAlt",
    titleKey: "life.featured.1.title",
    excerptKey: "life.featured.1.excerpt",
    authorNameKey: "life.featured.1.author",
    authorInitials: "SH",
    publishedAt: "2026-06-12",
    categories: ["workshop", "students"],
  },
  {
    id: "2",
    imageSrc:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop",
    imageAltKey: "life.featured.2.imageAlt",
    titleKey: "life.featured.2.title",
    excerptKey: "life.featured.2.excerpt",
    authorNameKey: "life.featured.2.author",
    authorInitials: "ON",
    publishedAt: "2026-05-28",
    categories: ["projects", "students"],
  },
  {
    id: "3",
    imageSrc:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop",
    imageAltKey: "life.featured.3.imageAlt",
    titleKey: "life.featured.3.title",
    excerptKey: "life.featured.3.excerpt",
    authorNameKey: "life.featured.3.author",
    authorInitials: "LF",
    publishedAt: "2026-04-15",
    categories: ["community", "events"],
  },
];

/** Placeholder blog cards for the Life feed — swap for real data later. */
export const PUBLIC_LIFE_BLOGS: LifeBlogCard[] = [
  {
    id: "b1",
    imageSrc:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=900&auto=format&fit=crop",
    imageAltKey: "life.post.1.imageAlt",
    titleKey: "life.post.1.title",
    excerptKey: "life.post.1.excerpt",
    bodyKeys: ["life.post.1.body1", "life.post.1.body2", "life.post.1.body3"],
    authorNameKey: "life.post.1.author",
    authorInitials: "SH",
    publishedAt: "2026-06-12",
    category: "workshop",
  },
  {
    id: "b2",
    imageSrc:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=900&auto=format&fit=crop",
    imageAltKey: "life.post.2.imageAlt",
    titleKey: "life.post.2.title",
    excerptKey: "life.post.2.excerpt",
    bodyKeys: ["life.post.2.body1", "life.post.2.body2", "life.post.2.body3"],
    authorNameKey: "life.post.2.author",
    authorInitials: "ON",
    publishedAt: "2026-05-28",
    category: "students",
  },
  {
    id: "b3",
    imageSrc:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=900&auto=format&fit=crop",
    imageAltKey: "life.post.3.imageAlt",
    titleKey: "life.post.3.title",
    excerptKey: "life.post.3.excerpt",
    bodyKeys: ["life.post.3.body1", "life.post.3.body2", "life.post.3.body3"],
    authorNameKey: "life.post.3.author",
    authorInitials: "LF",
    publishedAt: "2026-04-15",
    category: "community",
  },
  {
    id: "b4",
    imageSrc:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=900&auto=format&fit=crop",
    imageAltKey: "life.post.4.imageAlt",
    titleKey: "life.post.4.title",
    excerptKey: "life.post.4.excerpt",
    bodyKeys: ["life.post.4.body1", "life.post.4.body2", "life.post.4.body3"],
    authorNameKey: "life.post.4.author",
    authorInitials: "RK",
    publishedAt: "2026-03-22",
    category: "projects",
  },
  {
    id: "b5",
    imageSrc:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=900&auto=format&fit=crop",
    imageAltKey: "life.post.5.imageAlt",
    titleKey: "life.post.5.title",
    excerptKey: "life.post.5.excerpt",
    bodyKeys: ["life.post.5.body1", "life.post.5.body2", "life.post.5.body3"],
    authorNameKey: "life.post.5.author",
    authorInitials: "NA",
    publishedAt: "2026-02-18",
    category: "events",
  },
  {
    id: "b6",
    imageSrc:
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=900&auto=format&fit=crop",
    imageAltKey: "life.post.6.imageAlt",
    titleKey: "life.post.6.title",
    excerptKey: "life.post.6.excerpt",
    bodyKeys: ["life.post.6.body1", "life.post.6.body2", "life.post.6.body3"],
    authorNameKey: "life.post.6.author",
    authorInitials: "MH",
    publishedAt: "2026-01-09",
    category: "workshop",
  },
];

export const LIFE_BLOG_IDS = PUBLIC_LIFE_BLOGS.map((post) => post.id);

export function isLifeBlogId(id: string): boolean {
  return PUBLIC_LIFE_BLOGS.some((post) => post.id === id);
}

export function getLifeBlogById(id: string): LifeBlogCard | undefined {
  return PUBLIC_LIFE_BLOGS.find((post) => post.id === id);
}

/** Same-category first, then fill from the rest — excludes the current post. */
export function getSuggestedLifeBlogs(
  currentId: string,
  limit = 4
): LifeBlogCard[] {
  const current = getLifeBlogById(currentId);
  const others = PUBLIC_LIFE_BLOGS.filter((post) => post.id !== currentId);

  if (!current) return others.slice(0, limit);

  const sameCategory = others.filter(
    (post) => post.category === current.category
  );
  const rest = others.filter((post) => post.category !== current.category);

  return [...sameCategory, ...rest].slice(0, limit);
}
