import type { BlogStatusValue } from "@/lib/constants/manager-blog";

/** Public card / list projection (no draft-only fields required). */
export type PublicBlogCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categories: string[];
  thumbnail_url: string | null;
  author_name: string;
  author_avatar_url: string | null;
  reading_time_minutes: number;
  published_at: string | null;
  is_featured: boolean;
};

export type PublicBlogDetail = PublicBlogCard & {
  body_html: string;
  sources: string[];
  meta_title: string | null;
  meta_description: string | null;
  status: BlogStatusValue;
};
