import { z } from "zod";
import { WORKSHOP_STATUS_VALUES } from "@/lib/constants/manager-workshop-status";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const changeWorkshopStatusSchema = z.object({
  id: z.string().uuid({ message: "Invalid workshop id." }),
  status: z.enum(WORKSHOP_STATUS_VALUES, {
    message: "Select a valid workshop status.",
  }),
});

export type ChangeWorkshopStatusInput = z.infer<
  typeof changeWorkshopStatusSchema
>;

export function parseChangeWorkshopStatusFormData(formData: FormData):
  | { success: true; data: ChangeWorkshopStatusInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = changeWorkshopStatusSchema.safeParse({
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
