import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const deleteStudentPaymentPhaseSchema = z.object({
  id: z.string().trim().uuid({ message: "Student payment phase is required." }),
});

export type DeleteStudentPaymentPhaseInput = z.infer<
  typeof deleteStudentPaymentPhaseSchema
>;

export function parseDeleteStudentPaymentPhaseFormData(formData: FormData):
  | { success: true; data: DeleteStudentPaymentPhaseInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = deleteStudentPaymentPhaseSchema.safeParse({
    id: formData.get("id"),
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
