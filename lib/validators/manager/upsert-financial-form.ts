import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

function parseBool(value: FormDataEntryValue | null, fallback = false): boolean {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const normalized = String(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

function optionalNonNegativeNumber() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  }, z.coerce.number().min(0).nullable());
}

function optionalNonNegativeInt() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  }, z.coerce.number().int().min(0).nullable());
}

function optionalDate() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  }, z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Date must be YYYY-MM-DD.",
    })
    .nullable());
}

function optionalTrimmedString(max: number) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().max(max).nullable());
}

const formFields = {
  student_financial_adjustment_id: z
    .string()
    .trim()
    .uuid({ message: "Adjustment is required." }),
  full_name: z
    .string()
    .trim()
    .min(1, { message: "Full name is required." })
    .max(160, { message: "Full name must be at most 160 characters." }),
  school_or_university: optionalTrimmedString(160),
  date_of_birth: optionalDate(),
  phone: optionalTrimmedString(40),
  parent_phone: optionalTrimmedString(40),
  current_gpa: optionalTrimmedString(40),
  received_financial_aid_before: z.boolean(),
  certificates: optionalTrimmedString(500),
  family_members: optionalNonNegativeInt(),
  working_family_members: optionalNonNegativeInt(),
  total_family_income: optionalNonNegativeNumber(),
  children_currently_learning: optionalNonNegativeInt(),
  has_deceased_parent: z.boolean(),
  both_parents_work: z.boolean(),
  family_hardship: z.boolean(),
  family_chronic_disease: z.boolean(),
  affordable_monthly_payment: optionalNonNegativeNumber(),
  student_works: z.boolean(),
  student_monthly_income: optionalNonNegativeNumber(),
  agreed_to_rules: z.boolean().refine((value) => value === true, {
    message: "Agreement to rules is required.",
  }),
};

export const createFinancialFormSchema = z.object(formFields);

export type CreateFinancialFormInput = z.infer<typeof createFinancialFormSchema>;

export const updateFinancialFormSchema = z.object({
  id: z.string().trim().uuid({ message: "Form is required." }),
  ...formFields,
});

export type UpdateFinancialFormInput = z.infer<typeof updateFinancialFormSchema>;

function parseFormFields(formData: FormData) {
  return {
    student_financial_adjustment_id: formData.get(
      "student_financial_adjustment_id"
    ),
    full_name: formData.get("full_name"),
    school_or_university: formData.get("school_or_university") ?? "",
    date_of_birth: formData.get("date_of_birth") ?? "",
    phone: formData.get("phone") ?? "",
    parent_phone: formData.get("parent_phone") ?? "",
    current_gpa: formData.get("current_gpa") ?? "",
    received_financial_aid_before: parseBool(
      formData.get("received_financial_aid_before")
    ),
    certificates: formData.get("certificates") ?? "",
    family_members: formData.get("family_members") ?? "",
    working_family_members: formData.get("working_family_members") ?? "",
    total_family_income: formData.get("total_family_income") ?? "",
    children_currently_learning:
      formData.get("children_currently_learning") ?? "",
    has_deceased_parent: parseBool(formData.get("has_deceased_parent")),
    both_parents_work: parseBool(formData.get("both_parents_work")),
    family_hardship: parseBool(formData.get("family_hardship")),
    family_chronic_disease: parseBool(formData.get("family_chronic_disease")),
    affordable_monthly_payment:
      formData.get("affordable_monthly_payment") ?? "",
    student_works: parseBool(formData.get("student_works")),
    student_monthly_income: formData.get("student_monthly_income") ?? "",
    agreed_to_rules: parseBool(formData.get("agreed_to_rules")),
  };
}

export function parseCreateFinancialFormFormData(formData: FormData):
  | { success: true; data: CreateFinancialFormInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createFinancialFormSchema.safeParse(parseFormFields(formData));

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

export function parseUpdateFinancialFormFormData(formData: FormData):
  | { success: true; data: UpdateFinancialFormInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateFinancialFormSchema.safeParse({
    id: formData.get("id"),
    ...parseFormFields(formData),
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
