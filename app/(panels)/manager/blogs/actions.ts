"use server";

import {
  runManagerAction,
  runManagerMutation,
} from "@/lib/actions/run-manager-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidatePublicBlogs } from "@/lib/cache/public-content-cache";
import { ROUTES } from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import {
  parseCreateBlogFormData,
  parseCreateBlogFromJsonFormData,
} from "@/lib/validators/manager/create-blog";
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
  return runManagerAction({
    formData,
    parse: parseCreateBlogFormData,
    mutate: ({ adminClient, actor, data }) =>
      createBlogForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePublicBlogs(result.blog.slug);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      blog: result.blog,
    }),
  });
}

export async function createBlogFromJsonAction(
  _prevState: CreateBlogActionState,
  formData: FormData
): Promise<CreateBlogActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateBlogFromJsonFormData,
    mutate: ({ adminClient, actor, data }) =>
      createBlogForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePublicBlogs(result.blog.slug);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      blog: result.blog,
    }),
  });
}

export async function updateBlogAction(
  _prevState: UpdateBlogActionState,
  formData: FormData
): Promise<UpdateBlogActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateBlogFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateBlogForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePublicBlogs(result.blog.slug);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      blog: result.blog,
    }),
  });
}

export async function deleteBlogAction(
  _prevState: DeleteBlogActionState,
  formData: FormData
): Promise<DeleteBlogActionState> {
  const blogId = String(formData.get("id") ?? "").trim();

  if (!blogId) {
    return {
      success: false,
      error: "Blog not found.",
    };
  }

  return runManagerMutation({
    data: blogId,
    mutate: ({ adminClient, actor, data }) =>
      deleteBlogForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePublicBlogs(result.slug);
      revalidatePath(ROUTES.MANAGER_BLOGS);
    },
    mapSuccess: () => {
      redirect(appendQueryParam(ROUTES.MANAGER_BLOGS, "toast", "blog_deleted"));
    },
  });
}
