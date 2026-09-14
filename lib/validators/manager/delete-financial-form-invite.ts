import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

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

export function parseDeleteFinancialFormInviteFormData(formData: FormData) {
  return safeParseFormData(deleteFinancialFormInviteSchema, {
    id: formData.get("id"),
    student_payment_phase_id: formData.get("student_payment_phase_id"),
  });
}
