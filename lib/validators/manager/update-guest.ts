import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { createGuestSchema } from "@/lib/validators/manager/create-guest";
import type { FieldErrors } from "@/types/auth";

export const updateGuestSchema = createGuestSchema.extend({
  id: z.string().uuid({ message: "Invalid guest id." }),
});

export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

export function parseUpdateGuestFormData(formData: FormData):
  | { success: true; data: UpdateGuestInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateGuestSchema.safeParse({
    id: formData.get("id"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    age: formData.get("age"),
    school_or_university: formData.get("school_or_university"),
    education_level: formData.get("education_level"),
    interested_service: formData.get("interested_service"),
    notes: formData.get("notes"),
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
