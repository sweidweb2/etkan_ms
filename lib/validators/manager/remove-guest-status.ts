import { z } from "zod";
import { GUEST_PIPELINE_STATUS_VALUES } from "@/lib/constants/guest";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const removeGuestStatusSchema = z.object({
  id: z.string().uuid({ message: "Invalid guest id." }),
  status: z.enum(GUEST_PIPELINE_STATUS_VALUES, {
    message: "Select a valid pipeline status.",
  }),
});

export type RemoveGuestStatusInput = z.infer<typeof removeGuestStatusSchema>;

export function parseRemoveGuestStatusFormData(formData: FormData):
  | { success: true; data: RemoveGuestStatusInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = removeGuestStatusSchema.safeParse({
    id: formData.get("id"),
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
