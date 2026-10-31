import type { MetadataRoute } from "next";
import { CAREERS_ROADMAP_STAGE_IDS } from "@/lib/constants/careers-roadmaps";
import { ROUTES } from "@/lib/constants/routes";
import { absoluteUrl } from "@/lib/seo/absolute-url";
import { listPublishedBlogsForPublic } from "@/services/public/blog.service";

const STATIC_PATHS: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: ROUTES.HOME, changeFrequency: "weekly", priority: 1 },
  { path: ROUTES.ABOUT, changeFrequency: "monthly", priority: 0.8 },
  { path: ROUTES.CAREERS, changeFrequency: "weekly", priority: 0.9 },
  { path: ROUTES.PROJECTS, changeFrequency: "weekly", priority: 0.7 },
  { path: ROUTES.GALLERY, changeFrequency: "weekly", priority: 0.6 },
  { path: ROUTES.BLOGS, changeFrequency: "daily", priority: 0.8 },
  { path: ROUTES.REGISTER, changeFrequency: "monthly", priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((entry) => ({
    url: absoluteUrl(entry.path),
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  const roadmapEntries: MetadataRoute.Sitemap = CAREERS_ROADMAP_STAGE_IDS.map(
    (id) => ({
      url: absoluteUrl(`/careers/roadmap/${id}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    })
  );

  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await listPublishedBlogsForPublic();
    blogEntries = posts.map((post) => ({
      url: absoluteUrl(`/blogs/${post.slug}`),
      lastModified: post.published_at ? new Date(post.published_at) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    // Build/runtime without DB should still emit the static map.
    blogEntries = [];
  }

  return [...staticEntries, ...roadmapEntries, ...blogEntries];
}
