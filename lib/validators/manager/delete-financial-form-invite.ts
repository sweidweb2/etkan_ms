import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const deleteFinancialFormInviteSchema = z.object({
  id: z.string().trim().uuid({ message: "Invite is required." }),
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." }),
});

export type DeleteFinancialFormInviteInput = z.infer<
  typeof deleteFinancialFormInviteSchema
>;

export function parseDeleteFinancialFormInviteFormData(formData: FormData):
  | { success: true; data: DeleteFinancialFormInviteInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = deleteFinancialFormInviteSchema.safeParse({
    id: formData.get("id"),
    student_payment_phase_id: formData.get("student_payment_phase_id"),
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
