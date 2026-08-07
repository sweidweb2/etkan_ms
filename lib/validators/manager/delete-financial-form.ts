import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const deleteFinancialFormSchema = z.object({
  id: z.string().trim().uuid({ message: "Form is required." }),
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." }),
});

export type DeleteFinancialFormInput = z.infer<typeof deleteFinancialFormSchema>;

export function parseDeleteFinancialFormFormData(formData: FormData):
  | { success: true; data: DeleteFinancialFormInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = deleteFinancialFormSchema.safeParse({
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
