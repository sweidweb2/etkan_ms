import { z } from "zod";
import {
  WORKSHOP_INSTRUCTOR_ROLE_VALUES,
  WORKSHOP_WAGE_TYPES,
  WORKSHOP_WAGE_TYPE_VALUES,
} from "@/lib/constants/manager-workshop-display";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

function optionalTrimmedNotes() {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
  }, z
    .string()
    .max(2000, { message: "Notes must be at most 2000 characters." })
    .nullable());
}

function optionalWageAmount() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  }, z.coerce
    .number()
    .min(0, { message: "Wage amount must be 0 or greater." })
    .max(1_000_000, { message: "Wage amount must be at most 1,000,000." })
    .nullable());
}

const sharedFields = {
  role: z.enum(WORKSHOP_INSTRUCTOR_ROLE_VALUES, {
    message: "Select an instructor role.",
  }),
  wage_type: z.enum(WORKSHOP_WAGE_TYPE_VALUES, {
    message: "Select a wage type.",
  }),
  wage_amount: optionalWageAmount(),
  notes: optionalTrimmedNotes(),
};

function withWageRefine<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const record = data as {
      wage_type: string;
      wage_amount: number | null;
    };
    if (
      record.wage_type === WORKSHOP_WAGE_TYPES.PERCENTAGE &&
      record.wage_amount != null &&
      record.wage_amount > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage must be at most 100.",
        path: ["wage_amount"],
      });
    }
  });
}

export const createWorkshopInstructorSchema = withWageRefine(
  z.object({
    workshop_id: z.string().uuid({ message: "Workshop is required." }),
    user_id: z.string().uuid({ message: "Instructor is required." }),
    ...sharedFields,
  })
);

export type CreateWorkshopInstructorInput = z.infer<
  typeof createWorkshopInstructorSchema
>;

export const updateWorkshopInstructorSchema = withWageRefine(
  z.object({
    id: z.string().uuid({ message: "Assignment is required." }),
    workshop_id: z.string().uuid({ message: "Workshop is required." }),
    ...sharedFields,
  })
);

export type UpdateWorkshopInstructorInput = z.infer<
  typeof updateWorkshopInstructorSchema
>;

export const removeWorkshopInstructorSchema = z.object({
  id: z.string().uuid({ message: "Assignment is required." }),
  workshop_id: z.string().uuid({ message: "Workshop is required." }),
});

export type RemoveWorkshopInstructorInput = z.infer<
  typeof removeWorkshopInstructorSchema
>;

export function parseCreateWorkshopInstructorFormData(formData: FormData):
  | { success: true; data: CreateWorkshopInstructorInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createWorkshopInstructorSchema.safeParse({
    workshop_id: formData.get("workshop_id"),
    user_id: formData.get("user_id"),
    role: formData.get("role"),
    wage_type: formData.get("wage_type"),
    wage_amount: formData.get("wage_amount"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

export function parseUpdateWorkshopInstructorFormData(formData: FormData):
  | { success: true; data: UpdateWorkshopInstructorInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateWorkshopInstructorSchema.safeParse({
    id: formData.get("id"),
    workshop_id: formData.get("workshop_id"),
    role: formData.get("role"),
    wage_type: formData.get("wage_type"),
    wage_amount: formData.get("wage_amount"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

export function parseRemoveWorkshopInstructorFormData(formData: FormData):
  | { success: true; data: RemoveWorkshopInstructorInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = removeWorkshopInstructorSchema.safeParse({
    id: formData.get("id"),
    workshop_id: formData.get("workshop_id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
