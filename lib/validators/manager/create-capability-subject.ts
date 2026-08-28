import { z } from "zod";
import {
  isSubjectScope,
  type SubjectScope,
} from "@/lib/constants/subject-scope";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createCapabilitySubjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Subject name is required." })
    .max(120, {
      message: "Subject name must be at most 120 characters.",
    }),
});

export type CreateCapabilitySubjectInput = z.infer<
  typeof createCapabilitySubjectSchema
>;

export function parseCreateCapabilitySubjectFormData(formData: FormData):
  | { success: true; scope: SubjectScope; data: CreateCapabilitySubjectInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const scope = formData.get("scope");
  if (!isSubjectScope(scope)) {
    return { success: false, error: "Invalid subject scope." };
  }

  const parsed = createCapabilitySubjectSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(flattened),
    };
  }

  return { success: true, scope, data: parsed.data };
}
