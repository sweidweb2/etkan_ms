"use client";

import { useState, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updateBlogAction } from "@/app/manager/blogs/actions";
import {
  BlogFormFields,
  type BlogFormFieldErrors,
} from "@/components/manager/blogs/blog-form-fields";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type {
  ManagerBlogRow,
  UpdateBlogActionState,
} from "@/types/manager-blog";

const initialState: UpdateBlogActionState = {};

const emptyValues = {
  slug: "",
  title: "",
  summary: "",
  body_html: "",
  categoriesText: "",
  sourcesText: "",
  author_name: "",
  status: "draft",
  is_featured: false,
  meta_title: "",
  meta_description: "",
};

function valuesFromBlog(blog: ManagerBlogRow) {
  return {
    slug: blog.slug,
    title: blog.title,
    summary: blog.summary,
    body_html: blog.body_html,
    categoriesText: blog.categories.join(", "),
    sourcesText: blog.sources.join("\n"),
    author_name: blog.author_name,
    status: blog.status,
    is_featured: blog.is_featured,
    meta_title: blog.meta_title ?? "",
    meta_description: blog.meta_description ?? "",
  };
}

type EditBlogSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blog: ManagerBlogRow | null;
  onBlogUpdated: (blog: ManagerBlogRow) => void;
};

export function EditBlogSheet({
  open,
  onOpenChange,
  blog,
  onBlogUpdated,
}: EditBlogSheetProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateBlogAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  const [values, setValues] = useState(emptyValues);
  const [thumbnail, setThumbnail] = useState<File | undefined>();
  const [authorAvatar, setAuthorAvatar] = useState<File | undefined>();
  const [syncedBlogId, setSyncedBlogId] = useState<string | null>(null);

  const nextBlogId = open && blog ? blog.id : null;
  if (nextBlogId !== syncedBlogId) {
    setSyncedBlogId(nextBlogId);
    if (blog && nextBlogId) {
      setValues(valuesFromBlog(blog));
      setThumbnail(undefined);
      setAuthorAvatar(undefined);
    } else {
      setValues(emptyValues);
      setThumbnail(undefined);
      setAuthorAvatar(undefined);
    }
  }

  useActionStateToast(state, isPending);

  useActionStateSuccess(state, isPending, () => {
    if (state.blog) {
      onBlogUpdated(state.blog);
    }
    onOpenChange(false);
  });

  function onFieldChange(field: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blog) {
      return;
    }

    const formData = new FormData();
    formData.set("id", blog.id);
    formData.set("slug", values.slug.trim());
    formData.set("title", values.title.trim());
    formData.set("summary", values.summary.trim());
    formData.set("body_html", values.body_html);
    formData.set("categories", values.categoriesText);
    formData.set("sources", values.sourcesText);
    formData.set("author_name", values.author_name.trim());
    formData.set("status", values.status);
    formData.set("is_featured", values.is_featured ? "true" : "false");
    formData.set("meta_title", values.meta_title);
    formData.set("meta_description", values.meta_description);
    if (thumbnail) {
      formData.set("thumbnail", thumbnail);
    }
    if (authorAvatar) {
      formData.set("author_avatar", authorAvatar);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  const errors: BlogFormFieldErrors = {
    slug: state.fieldErrors?.slug?.[0],
    title: state.fieldErrors?.title?.[0],
    summary: state.fieldErrors?.summary?.[0],
    body_html: state.fieldErrors?.body_html?.[0],
    categories: state.fieldErrors?.categories?.[0],
    sources: state.fieldErrors?.sources?.[0],
    author_name: state.fieldErrors?.author_name?.[0],
    status: state.fieldErrors?.status?.[0],
    is_featured: state.fieldErrors?.is_featured?.[0],
    meta_title: state.fieldErrors?.meta_title?.[0],
    meta_description: state.fieldErrors?.meta_description?.[0],
    thumbnail: state.fieldErrors?.thumbnail?.[0],
    author_avatar: state.fieldErrors?.author_avatar?.[0],
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl"
        showCloseButton={!isPending}
      >
        <SheetHeader>
          <SheetTitle>Edit blog</SheetTitle>
          <SheetDescription>Update this public blog post.</SheetDescription>
        </SheetHeader>

        <form
          id="edit-blog-form"
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4"
          noValidate
        >
          <BlogFormFields
            idPrefix="edit-blog"
            values={values}
            onChange={onFieldChange}
            onBodyChange={(html) => onFieldChange("body_html", html)}
            onThumbnailChange={setThumbnail}
            onAuthorAvatarChange={setAuthorAvatar}
            errors={errors}
            isPending={isPending}
            currentThumbnailUrl={blog?.thumbnail_url}
            currentAuthorAvatarUrl={blog?.author_avatar_url}
            selectedThumbnailName={thumbnail?.name ?? null}
            selectedAvatarName={authorAvatar?.name ?? null}
          />
        </form>

        <SheetFooter className="border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-blog-form" disabled={isPending}>
            {isPending ? <InlineSpinner /> : null}
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
