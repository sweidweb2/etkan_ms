import { unstable_cache } from "next/cache";
import { loadPublicCachedData } from "@/lib/cache/load-public-cached-data";
import { PUBLIC_CONTENT_CACHE_TAGS } from "@/lib/cache/public-content-cache";
import {
  BLOG_STATUS_VALUES,
  type BlogStatusValue,
} from "@/lib/constants/manager-blog";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { estimateReadingTimeMinutes } from "@/lib/manager/blogs/reading-time";
import {
  AUTHOR_STORAGE_BUCKET,
  BLOGS_STORAGE_BUCKET,
  buildBlogImageStoragePath,
  getBlogImageObjectPathFromPublicUrl,
} from "@/lib/manager/blogs/storage-path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createBlogSchema } from "@/lib/validators/manager/create-blog";
import { updateBlogSchema } from "@/lib/validators/manager/update-blog";
import * as blogRepository from "@/repositories/blog.repository";
import type { BlogRecord } from "@/repositories/blog.repository";
import * as blogStorageRepository from "@/repositories/blog-storage.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerBlogRow } from "@/types/manager-blog";
import type { PublicBlogCard, PublicBlogDetail } from "@/types/public-blog";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateBlogSuccess = {
  success: true;
  blog: ManagerBlogRow;
  message: string;
};

export type CreateBlogFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateBlogResult = CreateBlogSuccess | CreateBlogFailure;

export type UpdateBlogSuccess = {
  success: true;
  blog: ManagerBlogRow;
  message: string;
};

export type UpdateBlogFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateBlogResult = UpdateBlogSuccess | UpdateBlogFailure;

export type DeleteBlogSuccess = {
  success: true;
  message: string;
  slug: string;
};

export type DeleteBlogFailure = {
  success: false;
  error: string;
};

export type DeleteBlogResult = DeleteBlogSuccess | DeleteBlogFailure;

function isBlogStatus(value: string): value is BlogStatusValue {
  return (BLOG_STATUS_VALUES as readonly string[]).includes(value);
}

function mapBlogRecordToRow(record: BlogRecord): ManagerBlogRow {
  if (!isBlogStatus(record.status)) {
    throw new Error("Invalid blog status.");
  }

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    summary: record.summary,
    body_html: record.body_html,
    categories: record.categories ?? [],
    thumbnail_url: record.thumbnail_url,
    author_name: record.author_name,
    author_avatar_url: record.author_avatar_url,
    status: record.status,
    is_featured: record.is_featured,
    reading_time_minutes: record.reading_time_minutes,
    published_at: record.published_at,
    sources: record.sources ?? [],
    meta_title: record.meta_title,
    meta_description: record.meta_description,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function mapBlogRecordToPublicCard(record: BlogRecord): PublicBlogCard {
  const row = mapBlogRecordToRow(record);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    categories: row.categories,
    thumbnail_url: row.thumbnail_url,
    author_name: row.author_name,
    author_avatar_url: row.author_avatar_url,
    reading_time_minutes: row.reading_time_minutes,
    published_at: row.published_at,
    is_featured: row.is_featured,
  };
}

function mapBlogRecordToPublicDetail(record: BlogRecord): PublicBlogDetail {
  const row = mapBlogRecordToRow(record);
  return {
    ...mapBlogRecordToPublicCard(record),
    body_html: row.body_html,
    sources: row.sources,
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    status: row.status,
  };
}

function auditPayload(record: BlogRecord) {
  return {
    slug: record.slug,
    title: record.title,
    status: record.status,
    is_featured: record.is_featured,
    categories: record.categories,
    author_name: record.author_name,
    published_at: record.published_at,
  };
}

function mapWriteBlogError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("blogs_slug_uidx") || normalized.includes("slug")) {
    return "A blog with this slug already exists.";
  }
  if (normalized.includes("blogs_one_featured_uidx") || normalized.includes("featured")) {
    return "Another blog is already featured. Unfeature it first or retry.";
  }

  return "Unable to save blog. Please try again.";
}

function resolvePublishedAt(
  status: BlogStatusValue,
  existingPublishedAt: string | null
): string | null {
  if (status === "published") {
    return existingPublishedAt ?? new Date().toISOString();
  }
  return existingPublishedAt;
}

async function uploadBlogBucketImage(
  adminClient: Supabase,
  bucket: typeof BLOGS_STORAGE_BUCKET | typeof AUTHOR_STORAGE_BUCKET,
  file: File
): Promise<
  | { success: true; publicUrl: string; storagePath: string }
  | { success: false; error: string }
> {
  const storagePath = buildBlogImageStoragePath(bucket, file.name);
  const contentType = file.type.trim();
  const fileBytes = await file.arrayBuffer();

  const uploadResult = await blogStorageRepository.uploadBlogImage(
    adminClient,
    bucket,
    storagePath,
    fileBytes,
    contentType
  );

  if (uploadResult.error) {
    return {
      success: false,
      error: uploadResult.error.message || "Unable to upload image.",
    };
  }

  const publicUrl = blogStorageRepository.getBlogImagePublicUrl(
    adminClient,
    bucket,
    storagePath
  );

  if (!publicUrl) {
    await blogStorageRepository.removeBlogImages(adminClient, bucket, [
      storagePath,
    ]);
    return { success: false, error: "Unable to upload image." };
  }

  return { success: true, publicUrl, storagePath };
}

async function removeStoredBlogImage(
  adminClient: Supabase,
  imageUrl: string | null,
  bucket: typeof BLOGS_STORAGE_BUCKET | typeof AUTHOR_STORAGE_BUCKET
): Promise<{ success: true } | { success: false; error: string }> {
  if (!imageUrl) {
    return { success: true };
  }

  const objectPath = getBlogImageObjectPathFromPublicUrl(imageUrl, bucket);
  if (!objectPath) {
    return { success: true };
  }

  const result = await blogStorageRepository.removeBlogImages(
    adminClient,
    bucket,
    [objectPath]
  );

  if (result.error) {
    return {
      success: false,
      error: result.error.message || "Unable to delete image.",
    };
  }

  return { success: true };
}

export async function listBlogsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerBlogRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.BLOGS_VIEW);

  const { data, error } = await blogRepository.listBlogs(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapBlogRecordToRow);
}

const listPublishedBlogsCached = unstable_cache(
  async () =>
    loadPublicCachedData([], async () => {
      const adminClient = createSupabaseAdminClient();
      const { data, error } =
        await blogRepository.listPublishedBlogs(adminClient);

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map(mapBlogRecordToPublicCard);
    }),
  ["public-blogs-list"],
  { tags: [PUBLIC_CONTENT_CACHE_TAGS.BLOGS], revalidate: 3600 }
);

export async function listPublishedBlogsForPublic(): Promise<PublicBlogCard[]> {
  return listPublishedBlogsCached();
}

const getPublishedBlogBySlugCached = unstable_cache(
  async (slug: string) =>
    loadPublicCachedData(null, async () => {
      const adminClient = createSupabaseAdminClient();
      const { data, error } = await blogRepository.findPublishedBlogBySlug(
        adminClient,
        slug
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      return mapBlogRecordToPublicDetail(data);
    }),
  ["public-blog-by-slug"],
  { tags: [PUBLIC_CONTENT_CACHE_TAGS.BLOGS], revalidate: 3600 }
);

export async function getPublishedBlogBySlugForPublic(
  slug: string
): Promise<PublicBlogDetail | null> {
  return getPublishedBlogBySlugCached(slug);
}

export async function getSuggestedPublishedBlogs(
  currentSlug: string,
  limit = 4
): Promise<PublicBlogCard[]> {
  const posts = await listPublishedBlogsForPublic();
  const current = posts.find((post) => post.slug === currentSlug);
  const others = posts.filter((post) => post.slug !== currentSlug);

  if (!current || current.categories.length === 0) {
    return others.slice(0, limit);
  }

  const primary = current.categories[0]!;
  const sameCategory = others.filter((post) =>
    post.categories.includes(primary)
  );
  const remainder = others.filter((post) => !post.categories.includes(primary));

  return [...sameCategory, ...remainder].slice(0, limit);
}

export async function createBlogForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<CreateBlogResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.BLOGS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createBlogSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let thumbnailUrl: string | null = null;
  let authorAvatarUrl: string | null = null;
  let uploadedThumbnailPath: string | null = null;
  let uploadedAvatarPath: string | null = null;

  if (parsed.data.thumbnail) {
    const uploaded = await uploadBlogBucketImage(
      adminClient,
      BLOGS_STORAGE_BUCKET,
      parsed.data.thumbnail
    );
    if (!uploaded.success) {
      return { success: false, error: uploaded.error };
    }
    thumbnailUrl = uploaded.publicUrl;
    uploadedThumbnailPath = uploaded.storagePath;
  }

  if (parsed.data.author_avatar) {
    const uploaded = await uploadBlogBucketImage(
      adminClient,
      AUTHOR_STORAGE_BUCKET,
      parsed.data.author_avatar
    );
    if (!uploaded.success) {
      if (uploadedThumbnailPath) {
        await blogStorageRepository.removeBlogImages(
          adminClient,
          BLOGS_STORAGE_BUCKET,
          [uploadedThumbnailPath]
        );
      }
      return { success: false, error: uploaded.error };
    }
    authorAvatarUrl = uploaded.publicUrl;
    uploadedAvatarPath = uploaded.storagePath;
  }

  if (parsed.data.is_featured) {
    const cleared = await blogRepository.clearFeaturedBlogs(adminClient);
    if (cleared.error) {
      if (uploadedThumbnailPath) {
        await blogStorageRepository.removeBlogImages(
          adminClient,
          BLOGS_STORAGE_BUCKET,
          [uploadedThumbnailPath]
        );
      }
      if (uploadedAvatarPath) {
        await blogStorageRepository.removeBlogImages(
          adminClient,
          AUTHOR_STORAGE_BUCKET,
          [uploadedAvatarPath]
        );
      }
      return {
        success: false,
        error: "Unable to update featured blog. Please try again.",
      };
    }
  }

  const readingTime = estimateReadingTimeMinutes(parsed.data.body_html);
  const publishedAt = resolvePublishedAt(parsed.data.status, null);

  const { data, error } = await blogRepository.createBlog(adminClient, {
    slug: parsed.data.slug,
    title: parsed.data.title,
    summary: parsed.data.summary,
    body_html: parsed.data.body_html,
    categories: parsed.data.categories,
    thumbnail_url: thumbnailUrl,
    author_name: parsed.data.author_name,
    author_avatar_url: authorAvatarUrl,
    status: parsed.data.status,
    is_featured: parsed.data.is_featured,
    reading_time_minutes: readingTime,
    published_at: publishedAt,
    sources: parsed.data.sources,
    meta_title: parsed.data.meta_title,
    meta_description: parsed.data.meta_description,
  });

  if (error || !data) {
    if (uploadedThumbnailPath) {
      await blogStorageRepository.removeBlogImages(
        adminClient,
        BLOGS_STORAGE_BUCKET,
        [uploadedThumbnailPath]
      );
    }
    if (uploadedAvatarPath) {
      await blogStorageRepository.removeBlogImages(
        adminClient,
        AUTHOR_STORAGE_BUCKET,
        [uploadedAvatarPath]
      );
    }
    return {
      success: false,
      error: mapWriteBlogError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "blogs",
    record_id: data.id,
    new_data: auditPayload(data),
    metadata: { note: "Blog created." },
  });

  return {
    success: true,
    blog: mapBlogRecordToRow(data),
    message: "Blog created.",
  };
}

export async function updateBlogForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UpdateBlogResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.BLOGS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateBlogSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await blogRepository.findBlogById(
    adminClient,
    parsed.data.id
  );

  if (existing.error) {
    return {
      success: false,
      error: "Unable to update blog. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Blog not found." };
  }

  let thumbnailUrl = existing.data.thumbnail_url;
  let authorAvatarUrl = existing.data.author_avatar_url;
  let uploadedThumbnailPath: string | null = null;
  let uploadedAvatarPath: string | null = null;

  if (parsed.data.thumbnail) {
    const uploaded = await uploadBlogBucketImage(
      adminClient,
      BLOGS_STORAGE_BUCKET,
      parsed.data.thumbnail
    );
    if (!uploaded.success) {
      return { success: false, error: uploaded.error };
    }
    thumbnailUrl = uploaded.publicUrl;
    uploadedThumbnailPath = uploaded.storagePath;
  }

  if (parsed.data.author_avatar) {
    const uploaded = await uploadBlogBucketImage(
      adminClient,
      AUTHOR_STORAGE_BUCKET,
      parsed.data.author_avatar
    );
    if (!uploaded.success) {
      if (uploadedThumbnailPath) {
        await blogStorageRepository.removeBlogImages(
          adminClient,
          BLOGS_STORAGE_BUCKET,
          [uploadedThumbnailPath]
        );
      }
      return { success: false, error: uploaded.error };
    }
    authorAvatarUrl = uploaded.publicUrl;
    uploadedAvatarPath = uploaded.storagePath;
  }

  if (parsed.data.is_featured) {
    const cleared = await blogRepository.clearFeaturedBlogs(
      adminClient,
      parsed.data.id
    );
    if (cleared.error) {
      if (uploadedThumbnailPath) {
        await blogStorageRepository.removeBlogImages(
          adminClient,
          BLOGS_STORAGE_BUCKET,
          [uploadedThumbnailPath]
        );
      }
      if (uploadedAvatarPath) {
        await blogStorageRepository.removeBlogImages(
          adminClient,
          AUTHOR_STORAGE_BUCKET,
          [uploadedAvatarPath]
        );
      }
      return {
        success: false,
        error: "Unable to update featured blog. Please try again.",
      };
    }
  }

  const readingTime = estimateReadingTimeMinutes(parsed.data.body_html);
  const publishedAt = resolvePublishedAt(
    parsed.data.status,
    existing.data.published_at
  );

  const { data, error } = await blogRepository.updateBlog(
    adminClient,
    parsed.data.id,
    {
      slug: parsed.data.slug,
      title: parsed.data.title,
      summary: parsed.data.summary,
      body_html: parsed.data.body_html,
      categories: parsed.data.categories,
      thumbnail_url: thumbnailUrl,
      author_name: parsed.data.author_name,
      author_avatar_url: authorAvatarUrl,
      status: parsed.data.status,
      is_featured: parsed.data.is_featured,
      reading_time_minutes: readingTime,
      published_at: publishedAt,
      sources: parsed.data.sources,
      meta_title: parsed.data.meta_title,
      meta_description: parsed.data.meta_description,
    }
  );

  if (error || !data) {
    if (uploadedThumbnailPath) {
      await blogStorageRepository.removeBlogImages(
        adminClient,
        BLOGS_STORAGE_BUCKET,
        [uploadedThumbnailPath]
      );
    }
    if (uploadedAvatarPath) {
      await blogStorageRepository.removeBlogImages(
        adminClient,
        AUTHOR_STORAGE_BUCKET,
        [uploadedAvatarPath]
      );
    }
    return {
      success: false,
      error: mapWriteBlogError(error?.message ?? "Unknown error"),
    };
  }

  if (
    uploadedThumbnailPath &&
    existing.data.thumbnail_url &&
    existing.data.thumbnail_url !== thumbnailUrl
  ) {
    await removeStoredBlogImage(
      adminClient,
      existing.data.thumbnail_url,
      BLOGS_STORAGE_BUCKET
    );
  }

  if (
    uploadedAvatarPath &&
    existing.data.author_avatar_url &&
    existing.data.author_avatar_url !== authorAvatarUrl
  ) {
    await removeStoredBlogImage(
      adminClient,
      existing.data.author_avatar_url,
      AUTHOR_STORAGE_BUCKET
    );
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "blogs",
    record_id: data.id,
    old_data: auditPayload(existing.data),
    new_data: auditPayload(data),
    metadata: { note: "Blog updated." },
  });

  return {
    success: true,
    blog: mapBlogRecordToRow(data),
    message: "Blog updated.",
  };
}

export async function deleteBlogForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  blogId: string
): Promise<DeleteBlogResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.BLOGS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existing = await blogRepository.findBlogById(adminClient, blogId);

  if (existing.error) {
    return {
      success: false,
      error: "Unable to delete blog. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Blog not found." };
  }

  const removedThumb = await removeStoredBlogImage(
    adminClient,
    existing.data.thumbnail_url,
    BLOGS_STORAGE_BUCKET
  );
  if (!removedThumb.success) {
    return {
      success: false,
      error: "Unable to delete the blog thumbnail. Please try again.",
    };
  }

  const removedAvatar = await removeStoredBlogImage(
    adminClient,
    existing.data.author_avatar_url,
    AUTHOR_STORAGE_BUCKET
  );
  if (!removedAvatar.success) {
    return {
      success: false,
      error: "Unable to delete the author avatar. Please try again.",
    };
  }

  const { error } = await blogRepository.deleteBlogById(adminClient, blogId);

  if (error) {
    return {
      success: false,
      error: "Unable to delete blog. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "blogs",
    record_id: blogId,
    old_data: auditPayload(existing.data),
    metadata: { note: "Blog deleted." },
  });

  return {
    success: true,
    message: "Blog deleted.",
    slug: existing.data.slug,
  };
}
