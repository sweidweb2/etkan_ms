import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { createRelationshipSchema } from "@/lib/validators/manager/create-relationship";
import type { FieldErrors } from "@/types/auth";

export const updateRelationshipSchema = createRelationshipSchema.extend({
  id: z.string().uuid({ message: "Invalid relationship id." }),
});

export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>;

export function parseUpdateRelationshipFormData(formData: FormData):
  | { success: true; data: UpdateRelationshipInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateRelationshipSchema.safeParse({
    id: formData.get("id"),
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
