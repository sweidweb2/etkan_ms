import type { FieldErrors } from "@/types/auth";
import type { BlogStatusValue } from "@/lib/constants/manager-blog";

export interface ManagerBlogRow {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export type CreateBlogActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  blog?: ManagerBlogRow;
};

export type UpdateBlogActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  blog?: ManagerBlogRow;
};

export type DeleteBlogActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};
