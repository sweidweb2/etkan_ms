import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const deleteStudentPaymentScheduleSchema = z.object({
  id: z.string().trim().uuid({ message: "Schedule row is required." }),
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." })
    .optional()
    .or(z.literal("")),
});

export type DeleteStudentPaymentScheduleInput = z.infer<
  typeof deleteStudentPaymentScheduleSchema
>;

export function parseDeleteStudentPaymentScheduleFormData(formData: FormData) {
  return safeParseFormData(deleteStudentPaymentScheduleSchema, {
    id: formData.get("id"),
    student_payment_phase_id: formData.get("student_payment_phase_id") ?? "",
  });
}
