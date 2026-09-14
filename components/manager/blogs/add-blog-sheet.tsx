"use client";

import { useActionState, useState, useTransition } from "react";
import { createBlogAction } from "@/app/manager/blogs/actions";
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
  CreateBlogActionState,
  ManagerBlogRow,
} from "@/types/manager-blog";

const initialState: CreateBlogActionState = {};

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

function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

type AddBlogSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlogCreated: (blog: ManagerBlogRow) => void;
};

export function AddBlogSheet({
  open,
  onOpenChange,
  onBlogCreated,
}: AddBlogSheetProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createBlogAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const [values, setValues] = useState(emptyValues);
  const [thumbnail, setThumbnail] = useState<File | undefined>();
  const [authorAvatar, setAuthorAvatar] = useState<File | undefined>();
  const [slugTouched, setSlugTouched] = useState(false);

  function resetForm() {
    setValues(emptyValues);
    setThumbnail(undefined);
    setAuthorAvatar(undefined);
    setSlugTouched(false);
  }

  const handleOpenChange = usePendingAwareOpenChange(isPending, (next) => {
    if (!next) {
      resetForm();
    }
    onOpenChange(next);
  });

  useActionStateToast(state, isPending);

  useActionStateSuccess(state, isPending, () => {
    resetForm();
    onOpenChange(false);
    if (state.blog) {
      onBlogCreated(state.blog);
    }
  });

  function onFieldChange(field: string, value: string | boolean) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !slugTouched && typeof value === "string") {
        next.slug = slugifyTitle(value);
      }
      if (field === "slug") {
        setSlugTouched(true);
      }
      return next;
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
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
          <SheetTitle>New blog</SheetTitle>
          <SheetDescription>
            Create a draft or published post for the public blogs page.
          </SheetDescription>
        </SheetHeader>

        <form
          id="add-blog-form"
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4"
          noValidate
        >
          <BlogFormFields
            idPrefix="add-blog"
            values={values}
            onChange={onFieldChange}
            onBodyChange={(html) => onFieldChange("body_html", html)}
            onThumbnailChange={setThumbnail}
            onAuthorAvatarChange={setAuthorAvatar}
            errors={errors}
            isPending={isPending}
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
          <Button type="submit" form="add-blog-form" disabled={isPending}>
            {isPending ? <InlineSpinner /> : null}
            Create blog
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
