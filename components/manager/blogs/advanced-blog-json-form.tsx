"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { createBlogFromJsonAction } from "@/app/manager/blogs/actions";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import {
  BLOG_IMAGE_ACCEPT,
} from "@/lib/constants/manager-blog";
import type {
  CreateBlogActionState,
  ManagerBlogRow,
} from "@/types/manager-blog";

const initialState: CreateBlogActionState = {};

export const ADVANCED_BLOG_JSON_TEMPLATE = `{
  "slug": "hello-world",
  "title": "Hello world",
  "summary": "A short summary for the card and SEO fallback.",
  "body_html": "<p>Write your HTML body here.</p>",
  "categories": ["Updates", "Community"],
  "sources": ["https://example.com/source"],
  "author_name": "Ada Lovelace",
  "status": "draft",
  "is_featured": false,
  "meta_title": null,
  "meta_description": null
}`;

type AdvancedBlogJsonFormProps = {
  onBlogCreated: (blog: ManagerBlogRow) => void;
};

export function AdvancedBlogJsonForm({
  onBlogCreated,
}: AdvancedBlogJsonFormProps) {
  const [jsonValue, setJsonValue] = useState(ADVANCED_BLOG_JSON_TEMPLATE);
  const [thumbnail, setThumbnail] = useState<File | undefined>();
  const [authorAvatar, setAuthorAvatar] = useState<File | undefined>();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createBlogFromJsonAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  useActionStateSuccess(state, isPending, (nextState) => {
    if (nextState.blog) {
      onBlogCreated(nextState.blog);
    }
    setJsonValue(ADVANCED_BLOG_JSON_TEMPLATE);
    setThumbnail(undefined);
    setAuthorAvatar(undefined);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData();
    formData.set("blog_json", jsonValue);
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

  return (
    <Card className="py-0">
      <CardHeader className="border-b py-3">
        <CardTitle>Advanced create</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Paste one blog object as JSON, optionally attach a thumbnail and
          author avatar, then save. Images are uploaded with the same import —
          do not put image URLs in the JSON.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="advanced-blog-thumbnail">Thumbnail image</Label>
              <Input
                id="advanced-blog-thumbnail"
                ref={thumbnailInputRef}
                type="file"
                accept={BLOG_IMAGE_ACCEPT}
                disabled={isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setThumbnail(file);
                }}
              />
              {thumbnail ? (
                <p className="text-xs text-muted-foreground">{thumbnail.name}</p>
              ) : null}
              {state.fieldErrors?.thumbnail?.[0] ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.thumbnail[0]}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="advanced-blog-avatar">Author avatar</Label>
              <Input
                id="advanced-blog-avatar"
                ref={avatarInputRef}
                type="file"
                accept={BLOG_IMAGE_ACCEPT}
                disabled={isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setAuthorAvatar(file);
                }}
              />
              {authorAvatar ? (
                <p className="text-xs text-muted-foreground">
                  {authorAvatar.name}
                </p>
              ) : null}
              {state.fieldErrors?.author_avatar?.[0] ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.author_avatar[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="advanced-blog-json">Blog JSON</Label>
            <textarea
              id="advanced-blog-json"
              value={jsonValue}
              onChange={(event) => setJsonValue(event.target.value)}
              spellCheck={false}
              disabled={isPending}
              rows={18}
              aria-label="Blog JSON"
              className="w-full resize-y rounded-md border border-input bg-zinc-950 px-3 py-3 font-mono text-xs leading-relaxed text-zinc-100 shadow-xs outline-none transition-[color,box-shadow] placeholder:text-zinc-500 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950"
            />
            {state.fieldErrors?.blog_json?.[0] ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.blog_json[0]}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <InlineSpinner className="mr-2" />
                  Importing…
                </>
              ) : (
                "Import blog"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
