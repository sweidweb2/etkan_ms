import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlogStatusValue } from "@/lib/constants/manager-blog";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const BLOG_COLUMNS =
  "id, slug, title, summary, body_html, categories, thumbnail_url, author_name, author_avatar_url, status, is_featured, reading_time_minutes, published_at, sources, meta_title, meta_description, created_at, updated_at";

export type BlogRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body_html: string;
  categories: string[];
  thumbnail_url: string | null;
  author_name: string;
  author_avatar_url: string | null;
  status: string;
  is_featured: boolean;
  reading_time_minutes: number;
  published_at: string | null;
  sources: string[];
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateBlogRecordInput = {
  slug: string;
  title: string;
  summary: string;
  body_html: string;
  categories: string[];
  thumbnail_url: string | null;
  author_name: string;
  author_avatar_url: string | null;
  status: BlogStatusValue;
  is_featured: boolean;
  reading_time_minutes: number;
  published_at: string | null;
  sources: string[];
  meta_title: string | null;
  meta_description: string | null;
};

export type UpdateBlogRecordInput = CreateBlogRecordInput;

export async function listBlogs(client: Supabase) {
  return client
    .from("blogs")
    .select(BLOG_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function listPublishedBlogs(client: Supabase) {
  return client
    .from("blogs")
    .select(BLOG_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });
}

export async function findBlogById(client: Supabase, id: string) {
  return client
    .from("blogs")
    .select(BLOG_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findBlogBySlug(client: Supabase, slug: string) {
  return client
    .from("blogs")
    .select(BLOG_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
}

export async function findPublishedBlogBySlug(client: Supabase, slug: string) {
  return client
    .from("blogs")
    .select(BLOG_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
}

export async function clearFeaturedBlogs(
  client: Supabase,
  exceptId?: string
) {
  let query = client
    .from("blogs")
    .update({ is_featured: false, updated_at: new Date().toISOString() })
    .eq("is_featured", true);

  if (exceptId) {
    query = query.neq("id", exceptId);
  }

  return query;
}

export async function createBlog(
  client: Supabase,
  input: CreateBlogRecordInput
) {
  return client
    .from("blogs")
    .insert({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      body_html: input.body_html,
      categories: input.categories,
      thumbnail_url: input.thumbnail_url,
      author_name: input.author_name,
      author_avatar_url: input.author_avatar_url,
      status: input.status,
      is_featured: input.is_featured,
      reading_time_minutes: input.reading_time_minutes,
      published_at: input.published_at,
      sources: input.sources,
      meta_title: input.meta_title,
      meta_description: input.meta_description,
    })
    .select(BLOG_COLUMNS)
    .single();
}

export async function updateBlog(
  client: Supabase,
  id: string,
  input: UpdateBlogRecordInput
) {
  return client
    .from("blogs")
    .update({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      body_html: input.body_html,
      categories: input.categories,
      thumbnail_url: input.thumbnail_url,
      author_name: input.author_name,
      author_avatar_url: input.author_avatar_url,
      status: input.status,
      is_featured: input.is_featured,
      reading_time_minutes: input.reading_time_minutes,
      published_at: input.published_at,
      sources: input.sources,
      meta_title: input.meta_title,
      meta_description: input.meta_description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(BLOG_COLUMNS)
    .single();
}

export async function deleteBlogById(client: Supabase, id: string) {
  return client.from("blogs").delete().eq("id", id);
}
