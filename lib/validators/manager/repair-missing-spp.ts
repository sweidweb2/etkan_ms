import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

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

export function parseRepairMissingSppFormData(formData: FormData):
  | { success: true; data: RepairMissingSppInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = repairMissingSppSchema.safeParse({
    payment_phase_id: formData.get("payment_phase_id"),
    student_id: formData.get("student_id"),
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
