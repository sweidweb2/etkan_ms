import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { WORKSHOP_FIELD_LIMITS } from "@/lib/constants/workshop-field-limits";
import {
  WORKSHOP_INSTRUCTOR_ROLE_VALUES,
  WORKSHOP_WAGE_TYPES,
  WORKSHOP_WAGE_TYPE_VALUES,
} from "@/lib/constants/manager-workshop-display";

function optionalTrimmedNotes() {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
  }, z
    .string()
    .max(WORKSHOP_FIELD_LIMITS.instructor_notes.max, {
      message: `Notes must be at most ${WORKSHOP_FIELD_LIMITS.instructor_notes.max} characters.`,
    })
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
    .min(WORKSHOP_FIELD_LIMITS.wage_amount.min, {
      message: "Wage amount must be 0 or greater.",
    })
    .max(WORKSHOP_FIELD_LIMITS.wage_amount.max, {
      message: `Wage amount must be at most ${WORKSHOP_FIELD_LIMITS.wage_amount.max.toLocaleString()}.`,
    })
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
      record.wage_amount > WORKSHOP_FIELD_LIMITS.wage_percentage.max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Percentage must be at most ${WORKSHOP_FIELD_LIMITS.wage_percentage.max}.`,
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

export function parseCreateWorkshopInstructorFormData(formData: FormData) {
  return safeParseFormData(createWorkshopInstructorSchema, {
    workshop_id: formData.get("workshop_id"),
    user_id: formData.get("user_id"),
    role: formData.get("role"),
    wage_type: formData.get("wage_type"),
    wage_amount: formData.get("wage_amount"),
    notes: formData.get("notes"),
  });
}

export function parseUpdateWorkshopInstructorFormData(formData: FormData) {
  return safeParseFormData(updateWorkshopInstructorSchema, {
    id: formData.get("id"),
    workshop_id: formData.get("workshop_id"),
    role: formData.get("role"),
    wage_type: formData.get("wage_type"),
    wage_amount: formData.get("wage_amount"),
    notes: formData.get("notes"),
  });
}

export function parseRemoveWorkshopInstructorFormData(formData: FormData) {
  return safeParseFormData(removeWorkshopInstructorSchema, {
    id: formData.get("id"),
    workshop_id: formData.get("workshop_id"),
  });
}
