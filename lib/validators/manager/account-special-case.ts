import { z } from "zod";
import {
  ACCOUNT_SPECIAL_CASE_STATUS_VALUES,
  ACCOUNT_SPECIAL_CASE_TYPE_VALUES,
} from "@/lib/constants/manager-account-special-case";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const accountSpecialCaseFieldsSchema = z.object({
  total_amount: z.coerce
    .number({ message: "Total amount is required." })
    .min(0, { message: "Total amount must be zero or greater." }),
  explanation: z
    .string()
    .trim()
    .min(1, { message: "Explanation is required." })
    .max(2000, { message: "Explanation is too long." }),
  case_type: z.enum(ACCOUNT_SPECIAL_CASE_TYPE_VALUES, {
    message: "Case type is required.",
  }),
  status: z.enum(ACCOUNT_SPECIAL_CASE_STATUS_VALUES, {
    message: "Status is required.",
  }),
});

export type AccountSpecialCaseFieldsInput = z.infer<
  typeof accountSpecialCaseFieldsSchema
>;

export const createAccountSpecialCaseSchema = accountSpecialCaseFieldsSchema.extend({
  account_id: z.string().trim().uuid({ message: "Account is required." }),
  semester_id: z.string().trim().uuid({ message: "Semester is required." }),
});

export type CreateAccountSpecialCaseInput = z.infer<
  typeof createAccountSpecialCaseSchema
>;

export const updateAccountSpecialCaseSchema = accountSpecialCaseFieldsSchema.extend({
  id: z.string().trim().uuid({ message: "Special case is required." }),
});

export type UpdateAccountSpecialCaseInput = z.infer<
  typeof updateAccountSpecialCaseSchema
>;

export function parseCreateAccountSpecialCaseFormData(formData: FormData):
  | { success: true; data: CreateAccountSpecialCaseInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createAccountSpecialCaseSchema.safeParse({
    account_id: formData.get("account_id"),
    semester_id: formData.get("semester_id"),
    total_amount: formData.get("total_amount"),
    explanation: formData.get("explanation"),
    case_type: formData.get("case_type"),
    status: formData.get("status"),
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

export function parseUpdateAccountSpecialCaseFormData(formData: FormData):
  | { success: true; data: UpdateAccountSpecialCaseInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateAccountSpecialCaseSchema.safeParse({
    id: formData.get("id"),
    total_amount: formData.get("total_amount"),
    explanation: formData.get("explanation"),
    case_type: formData.get("case_type"),
    status: formData.get("status"),
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
