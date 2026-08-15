"use client";

import type {
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { FieldLabel } from "@/components/auth/field-label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PUBLIC_PROJECT_CLASSIFICATION_LABELS,
  PUBLIC_PROJECT_CLASSIFICATION_VALUES,
  PUBLIC_PROJECT_FIELD_LIMITS,
  PUBLIC_PROJECT_IMAGE_ACCEPT,
  PUBLIC_PROJECT_IMAGE_MAX_BYTES,
} from "@/lib/constants/manager-public-project";
import { cn } from "@/lib/utils";

const textareaClassName = cn(
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
);

export type PublicProjectFormFieldErrors = {
  classification?: string;
  category?: string;
  title?: string;
  body?: string;
  image?: string;
  href?: string;
};

type PublicProjectFormFieldsProps = {
  idPrefix: string;
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  classification: string;
  errors: PublicProjectFormFieldErrors;
  isPending: boolean;
  imageRequired: boolean;
  currentImageUrl?: string | null;
  currentImageAlt?: string;
  selectedImageName?: string | null;
  fileInputKey?: string;
};

export function PublicProjectFormFields({
  idPrefix,
  register,
  setValue,
  classification,
  errors,
  isPending,
  imageRequired,
  currentImageUrl,
  currentImageAlt,
  selectedImageName,
  fileInputKey,
}: PublicProjectFormFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor={`${idPrefix}-classification`}
            label="Classification"
            hint="Required"
          />
          <Select
            value={classification}
            onValueChange={(value) => {
              if (!value) return;
              setValue("classification", value, { shouldValidate: true });
            }}
            disabled={isPending}
          >
            <SelectTrigger
              id={`${idPrefix}-classification`}
              aria-invalid={!!errors.classification}
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PUBLIC_PROJECT_CLASSIFICATION_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {PUBLIC_PROJECT_CLASSIFICATION_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.classification ? (
            <p className="text-sm text-destructive">{errors.classification}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor={`${idPrefix}-category`}
            label="Category"
            hint="Required"
          />
          <Input
            id={`${idPrefix}-category`}
            placeholder="Mobile app"
            maxLength={PUBLIC_PROJECT_FIELD_LIMITS.category.max}
            aria-invalid={!!errors.category}
            disabled={isPending}
            {...register("category")}
          />
          {errors.category ? (
            <p className="text-sm text-destructive">{errors.category}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-title`}
          label="Title"
          hint="Required"
        />
        <Input
          id={`${idPrefix}-title`}
          maxLength={PUBLIC_PROJECT_FIELD_LIMITS.title.max}
          aria-invalid={!!errors.title}
          disabled={isPending}
          {...register("title")}
        />
        {errors.title ? (
          <p className="text-sm text-destructive">{errors.title}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-body`}
          label="Body"
          hint="Required"
        />
        <textarea
          id={`${idPrefix}-body`}
          rows={3}
          maxLength={PUBLIC_PROJECT_FIELD_LIMITS.body.max}
          aria-invalid={!!errors.body}
          disabled={isPending}
          className={textareaClassName}
          {...register("body")}
        />
        {errors.body ? (
          <p className="text-sm text-destructive">{errors.body}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-image`}
          label="Image"
          hint={imageRequired ? "Required" : "Optional"}
        />
        {currentImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImageUrl}
            alt={currentImageAlt ?? ""}
            className="h-20 w-auto max-w-full rounded-md border border-border object-cover"
          />
        ) : null}
        <Input
          id={`${idPrefix}-image`}
          key={fileInputKey}
          type="file"
          accept={PUBLIC_PROJECT_IMAGE_ACCEPT}
          disabled={isPending}
          aria-invalid={!!errors.image}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setValue("image", file ?? undefined, { shouldValidate: true });
          }}
        />
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP, or GIF. Max{" "}
          {Math.round(PUBLIC_PROJECT_IMAGE_MAX_BYTES / (1024 * 1024))} MB
          {imageRequired
            ? "."
            : ". Leave empty to keep the current image."}
        </p>
        {selectedImageName ? (
          <p className="truncate text-xs text-muted-foreground">
            {selectedImageName}
          </p>
        ) : null}
        {errors.image ? (
          <p className="text-sm text-destructive">{errors.image}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-href`}
          label="Path"
          hint="Optional"
        />
        <Input
          id={`${idPrefix}-href`}
          placeholder="/path or https://"
          maxLength={PUBLIC_PROJECT_FIELD_LIMITS.href.max}
          aria-invalid={!!errors.href}
          disabled={isPending}
          {...register("href")}
        />
        {errors.href ? (
          <p className="text-sm text-destructive">{errors.href}</p>
        ) : null}
      </div>
    </>
  );
}
