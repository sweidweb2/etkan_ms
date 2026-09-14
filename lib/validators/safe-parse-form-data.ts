import type { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const FORM_VALIDATION_ERROR = "Please fix the errors below.";

export type ParseFormSuccess<T> = { success: true; data: T };

export type ParseFormFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ParseFormResult<T> = ParseFormSuccess<T> | ParseFormFailure;

/** Shared Zod form-data parse → action fieldErrors shape. */
export function safeParseFormData<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  values: unknown
): ParseFormResult<z.infer<TSchema>> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return formValidationFailure(
      zodFieldErrors(parsed.error.flatten().fieldErrors)
    );
  }
  return { success: true, data: parsed.data };
}

/** Early validation failure (non-Zod) with the same error copy. */
export function formValidationFailure(
  fieldErrors?: FieldErrors,
  error: string = FORM_VALIDATION_ERROR
): ParseFormFailure {
  return fieldErrors
    ? { success: false, error, fieldErrors }
    : { success: false, error };
}
