import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const repairMissingSppSchema = z.object({
  payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Payment phase is required." }),
  student_id: z
    .string()
    .trim()
    .uuid({ message: "Student is required." }),
});

export type RepairMissingSppInput = z.infer<typeof repairMissingSppSchema>;

export function parseRepairMissingSppFormData(formData: FormData) {
  return safeParseFormData(repairMissingSppSchema, {
    payment_phase_id: formData.get("payment_phase_id"),
    student_id: formData.get("student_id"),
  });
}
