import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import {
  isSubjectScope,
  type SubjectScope,
} from "@/lib/constants/subject-scope";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const updateCapabilitySubjectSchema = z.object({
  id: z.string().uuid({ message: "Subject not found." }),
  name: z
    .string()
    .trim()
    .min(1, { message: "Subject name is required." })
    .max(120, {
      message: "Subject name must be at most 120 characters.",
    }),
});

export type UpdateCapabilitySubjectInput = z.infer<
  typeof updateCapabilitySubjectSchema
>;

export function parseUpdateCapabilitySubjectFormData(formData: FormData):
  | { success: true; scope: SubjectScope; data: UpdateCapabilitySubjectInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const scope = formData.get("scope");
  if (!isSubjectScope(scope)) {
    return { success: false, error: "Invalid subject scope." };
  }

  const parsed = updateCapabilitySubjectSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return { success: true, scope, data: parsed.data };
}
