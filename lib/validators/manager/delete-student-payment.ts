import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const deleteStudentPaymentSchema = z.object({
  id: z.string().trim().uuid({ message: "Payment is required." }),
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." })
    .optional()
    .or(z.literal("")),
  also_delete_clearance: z
    .union([z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
});

export type DeleteStudentPaymentInput = z.infer<
  typeof deleteStudentPaymentSchema
>;

export function parseDeleteStudentPaymentFormData(formData: FormData) {
  return safeParseFormData(deleteStudentPaymentSchema, {
    id: formData.get("id"),
    student_payment_phase_id: formData.get("student_payment_phase_id") ?? "",
    also_delete_clearance: formData.get("also_delete_clearance") ?? "",
  });
}
