"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidatePublicBlogs } from "@/lib/cache/public-content-cache";
import { ROUTES } from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateBlogFormData, parseCreateBlogFromJsonFormData } from "@/lib/validators/manager/create-blog";
import { parseUpdateBlogFormData } from "@/lib/validators/manager/update-blog";
import {
  createBlogForManager,
  deleteBlogForManager,
  updateBlogForManager,
} from "@/services/public/blog.service";
import type {
  CreateBlogActionState,
  DeleteBlogActionState,
  UpdateBlogActionState,
} from "@/types/manager-blog";

export async function createBlogAction(
  _prevState: CreateBlogActionState,
  formData: FormData
): Promise<CreateBlogActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateBlogFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createBlogForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePublicBlogs(result.blog.slug);

  return {
    success: true,
    message: result.message,
    blog: result.blog,
  };
}

export async function createBlogFromJsonAction(
  _prevState: CreateBlogActionState,
  formData: FormData
): Promise<CreateBlogActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateBlogFromJsonFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createBlogForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePublicBlogs(result.blog.slug);

  return {
    success: true,
    message: result.message,
    blog: result.blog,
  };
}

export async function updateBlogAction(
  _prevState: UpdateBlogActionState,
  formData: FormData
): Promise<UpdateBlogActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateBlogFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateBlogForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePublicBlogs(result.blog.slug);

  return {
    success: true,
    message: result.message,
    blog: result.blog,
  };
}

export async function deleteBlogAction(
  _prevState: DeleteBlogActionState,
  formData: FormData
): Promise<DeleteBlogActionState> {
  const actor = await getSessionAuditActor();
  const blogId = String(formData.get("id") ?? "").trim();

  if (!blogId) {
    return {
      success: false,
      error: "Blog not found.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteBlogForManager(
    adminClient,
    actor.userId,
    actor,
    blogId
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePublicBlogs(result.slug);
  revalidatePath(ROUTES.MANAGER_BLOGS);
  redirect(appendQueryParam(ROUTES.MANAGER_BLOGS, "toast", "blog_deleted"));
}
