import { z } from "zod";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createRelationshipSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Contact name is required." })
    .max(100, { message: "Contact name must be at most 100 characters." }),
  phone: z
    .string()
    .trim()
    .max(AUTH_LIMITS.phone.max, {
      message: `Phone must be at most ${AUTH_LIMITS.phone.max} characters.`,
    })
    .optional()
    .or(z.literal("")),
  relation_with: z
    .string()
    .trim()
    .max(50, { message: "Relation must be at most 50 characters." })
    .optional()
    .or(z.literal("")),
  major: z
    .string()
    .trim()
    .max(100, { message: "Major must be at most 100 characters." })
    .optional()
    .or(z.literal("")),
  speciality: z
    .string()
    .trim()
    .max(100, { message: "Speciality must be at most 100 characters." })
    .optional()
    .or(z.literal("")),
  is_useful: z.boolean(),
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;

export function parseCreateRelationshipFormData(formData: FormData):
  | { success: true; data: CreateRelationshipInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createRelationshipSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    relation_with: formData.get("relation_with"),
    major: formData.get("major"),
    speciality: formData.get("speciality"),
    is_useful: formData.get("is_useful") === "true",
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(flattened),
    };
  }

  return { success: true, data: parsed.data };
}
