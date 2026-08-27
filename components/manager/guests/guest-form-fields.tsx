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
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  GUEST_EDUCATION_LEVEL_LABELS,
  GUEST_EDUCATION_LEVEL_VALUES,
  GUEST_INTERESTED_SERVICE_LABELS,
  GUEST_INTERESTED_SERVICE_VALUES,
} from "@/lib/constants/guest";
import { cn } from "@/lib/utils";

const textareaClassName = cn(
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
);

export type GuestFormFieldErrors = {
  full_name?: string;
  phone?: string;
  age?: string;
  school_or_university?: string;
  education_level?: string;
  interested_service?: string;
  notes?: string;
};

type GuestFormFieldsProps = {
  idPrefix: string;
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  educationLevel: string | null | undefined;
  interestedService: string | null | undefined;
  errors: GuestFormFieldErrors;
  isPending: boolean;
};

export function GuestFormFields({
  idPrefix,
  register,
  setValue,
  educationLevel,
  interestedService,
  errors,
  isPending,
}: GuestFormFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor={`${idPrefix}-full-name`}
            label="Full name"
            hint="Required"
          />
          <Input
            id={`${idPrefix}-full-name`}
            maxLength={AUTH_LIMITS.fullName.max}
            aria-invalid={!!errors.full_name}
            disabled={isPending}
            {...register("full_name")}
          />
          {errors.full_name ? (
            <p className="text-sm text-destructive">{errors.full_name}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor={`${idPrefix}-phone`}
            label="Phone"
            hint="Optional"
          />
          <Input
            id={`${idPrefix}-phone`}
            maxLength={AUTH_LIMITS.phone.max}
            aria-invalid={!!errors.phone}
            disabled={isPending}
            {...register("phone")}
          />
          {errors.phone ? (
            <p className="text-sm text-destructive">{errors.phone}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor={`${idPrefix}-school`}
            label="School / university"
            hint="Optional"
          />
          <Input
            id={`${idPrefix}-school`}
            maxLength={200}
            aria-invalid={!!errors.school_or_university}
            disabled={isPending}
            {...register("school_or_university")}
          />
          {errors.school_or_university ? (
            <p className="text-sm text-destructive">
              {errors.school_or_university}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor={`${idPrefix}-age`} label="Age" hint="Optional" />
          <Input
            id={`${idPrefix}-age`}
            type="number"
            min={1}
            max={120}
            aria-invalid={!!errors.age}
            disabled={isPending}
            {...register("age")}
          />
          {errors.age ? (
            <p className="text-sm text-destructive">{errors.age}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor={`${idPrefix}-education`}
            label="Education level"
            hint="Optional"
          />
          <Select
            value={educationLevel || undefined}
            onValueChange={(value) => {
              if (!value) return;
              setValue("education_level", value, { shouldValidate: true });
            }}
            disabled={isPending}
          >
            <SelectTrigger
              id={`${idPrefix}-education`}
              aria-invalid={!!errors.education_level}
              className="w-full"
            >
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {GUEST_EDUCATION_LEVEL_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {GUEST_EDUCATION_LEVEL_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.education_level ? (
            <p className="text-sm text-destructive">{errors.education_level}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor={`${idPrefix}-service`}
            label="Interested service"
            hint="Optional"
          />
          <Select
            value={interestedService || undefined}
            onValueChange={(value) => {
              if (!value) return;
              setValue("interested_service", value, { shouldValidate: true });
            }}
            disabled={isPending}
          >
            <SelectTrigger
              id={`${idPrefix}-service`}
              aria-invalid={!!errors.interested_service}
              className="w-full"
            >
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              {GUEST_INTERESTED_SERVICE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {GUEST_INTERESTED_SERVICE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.interested_service ? (
            <p className="text-sm text-destructive">
              {errors.interested_service}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-notes`}
          label="Notes"
          hint="Optional"
        />
        <textarea
          id={`${idPrefix}-notes`}
          rows={3}
          maxLength={2000}
          aria-invalid={!!errors.notes}
          disabled={isPending}
          className={textareaClassName}
          {...register("notes")}
        />
        {errors.notes ? (
          <p className="text-sm text-destructive">{errors.notes}</p>
        ) : null}
      </div>
    </>
  );
}
