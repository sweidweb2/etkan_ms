"use client";

import { TiptapEmailEditor } from "@/components/manager/emailing/tiptap-email-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  BLOG_IMAGE_ACCEPT,
  BLOG_STATUS_LABELS,
  BLOG_STATUS_VALUES,
} from "@/lib/constants/manager-blog";
import { cn } from "@/lib/utils";

export type BlogFormFieldErrors = {
  slug?: string;
  title?: string;
  summary?: string;
  body_html?: string;
  categories?: string;
  sources?: string;
  author_name?: string;
  status?: string;
  is_featured?: string;
  meta_title?: string;
  meta_description?: string;
  thumbnail?: string;
  author_avatar?: string;
};

type BlogFormFieldsProps = {
  idPrefix: string;
  values: {
    slug: string;
    title: string;
    summary: string;
    body_html: string;
    categoriesText: string;
    sourcesText: string;
    author_name: string;
    status: string;
    is_featured: boolean;
    meta_title: string;
    meta_description: string;
  };
  onChange: (field: string, value: string | boolean) => void;
  onBodyChange: (html: string) => void;
  onThumbnailChange: (file: File | undefined) => void;
  onAuthorAvatarChange: (file: File | undefined) => void;
  errors: BlogFormFieldErrors;
  isPending: boolean;
  currentThumbnailUrl?: string | null;
  currentAuthorAvatarUrl?: string | null;
  selectedThumbnailName?: string | null;
  selectedAvatarName?: string | null;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return <p className="text-sm text-destructive">{message}</p>;
}

export function BlogFormFields({
  idPrefix,
  values,
  onChange,
  onBodyChange,
  onThumbnailChange,
  onAuthorAvatarChange,
  errors,
  isPending,
  currentThumbnailUrl,
  currentAuthorAvatarUrl,
  selectedThumbnailName,
  selectedAvatarName,
}: BlogFormFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          disabled={isPending}
          aria-invalid={Boolean(errors.title) || undefined}
        />
        <FieldError message={errors.title} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-slug`}>Slug</Label>
        <Input
          id={`${idPrefix}-slug`}
          value={values.slug}
          onChange={(event) => onChange("slug", event.target.value)}
          disabled={isPending}
          placeholder="my-post-title"
          aria-invalid={Boolean(errors.slug) || undefined}
        />
        <FieldError message={errors.slug} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-summary`}>Summary</Label>
        <textarea
          id={`${idPrefix}-summary`}
          value={values.summary}
          onChange={(event) => onChange("summary", event.target.value)}
          disabled={isPending}
          rows={3}
          className={cn(
            "min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            errors.summary && "border-destructive"
          )}
          aria-invalid={Boolean(errors.summary) || undefined}
        />
        <FieldError message={errors.summary} />
      </div>

      <div className="grid gap-2">
        <Label>Body</Label>
        <TiptapEmailEditor
          value={values.body_html}
          onChange={(html) => onBodyChange(html)}
          disabled={isPending}
          invalid={Boolean(errors.body_html)}
        />
        <FieldError message={errors.body_html} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-categories`}>
          Categories (comma or newline separated)
        </Label>
        <textarea
          id={`${idPrefix}-categories`}
          value={values.categoriesText}
          onChange={(event) => onChange("categoriesText", event.target.value)}
          disabled={isPending}
          rows={2}
          className={cn(
            "min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            errors.categories && "border-destructive"
          )}
        />
        <FieldError message={errors.categories} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-author`}>Author name</Label>
        <Input
          id={`${idPrefix}-author`}
          value={values.author_name}
          onChange={(event) => onChange("author_name", event.target.value)}
          disabled={isPending}
          aria-invalid={Boolean(errors.author_name) || undefined}
        />
        <FieldError message={errors.author_name} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-status`}>Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) => {
              if (value) {
                onChange("status", value);
              }
            }}
            disabled={isPending}
          >
            <SelectTrigger id={`${idPrefix}-status`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BLOG_STATUS_VALUES.map((status) => (
                <SelectItem key={status} value={status}>
                  {BLOG_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.status} />
        </div>

        <div className="flex items-end gap-3 pb-1">
          <Switch
            id={`${idPrefix}-featured`}
            checked={values.is_featured}
            onCheckedChange={(checked) => onChange("is_featured", checked)}
            disabled={isPending}
          />
          <Label htmlFor={`${idPrefix}-featured`}>Featured post</Label>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-thumbnail`}>Thumbnail image</Label>
        {currentThumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentThumbnailUrl}
            alt=""
            className="h-24 w-full rounded-md object-cover"
          />
        ) : null}
        <Input
          id={`${idPrefix}-thumbnail`}
          type="file"
          accept={BLOG_IMAGE_ACCEPT}
          disabled={isPending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            onThumbnailChange(file);
          }}
        />
        {selectedThumbnailName ? (
          <p className="text-xs text-muted-foreground">{selectedThumbnailName}</p>
        ) : null}
        <FieldError message={errors.thumbnail} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-avatar`}>Author avatar</Label>
        {currentAuthorAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentAuthorAvatarUrl}
            alt=""
            className="size-12 rounded-full object-cover"
          />
        ) : null}
        <Input
          id={`${idPrefix}-avatar`}
          type="file"
          accept={BLOG_IMAGE_ACCEPT}
          disabled={isPending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            onAuthorAvatarChange(file);
          }}
        />
        {selectedAvatarName ? (
          <p className="text-xs text-muted-foreground">{selectedAvatarName}</p>
        ) : null}
        <FieldError message={errors.author_avatar} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-sources`}>
          Sources (comma or newline separated)
        </Label>
        <textarea
          id={`${idPrefix}-sources`}
          value={values.sourcesText}
          onChange={(event) => onChange("sourcesText", event.target.value)}
          disabled={isPending}
          rows={2}
          className={cn(
            "min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            errors.sources && "border-destructive"
          )}
        />
        <FieldError message={errors.sources} />
      </div>

      <div className="grid gap-3 rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-4">
        <div>
          <p className="text-sm font-semibold">SEO checklist (before publish)</p>
          <ul className="mt-1.5 list-disc space-y-1 ps-4 text-xs text-muted-foreground">
            <li>Unique meta title (~50–60 chars) — do not repeat the brand suffix.</li>
            <li>Meta description (~120–155 chars) that answers the reader’s intent.</li>
            <li>Summary doubles as the public “Key takeaway” — keep it direct.</li>
            <li>One clear H1 in the title; use H2s in the body; add image alts.</li>
            <li>Link to a related careers, projects, or register page when relevant.</li>
          </ul>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-meta-title`}>Meta title (optional)</Label>
          <Input
            id={`${idPrefix}-meta-title`}
            value={values.meta_title}
            onChange={(event) => onChange("meta_title", event.target.value)}
            disabled={isPending}
            placeholder="e.g. How Etkan workshops build real skills"
          />
          <p className="text-xs text-muted-foreground">
            {values.meta_title.trim().length}/120 characters
          </p>
          <FieldError message={errors.meta_title} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-meta-description`}>
            Meta description (optional)
          </Label>
          <textarea
            id={`${idPrefix}-meta-description`}
            value={values.meta_description}
            onChange={(event) =>
              onChange("meta_description", event.target.value)
            }
            disabled={isPending}
            rows={2}
            placeholder="One or two sentences that earn the click from search."
            className={cn(
              "min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              errors.meta_description && "border-destructive"
            )}
          />
          <p className="text-xs text-muted-foreground">
            {values.meta_description.trim().length}/300 characters
          </p>
          <FieldError message={errors.meta_description} />
        </div>
      </div>
    </div>
  );
}
