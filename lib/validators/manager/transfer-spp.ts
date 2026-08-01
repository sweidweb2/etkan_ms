import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const transferSppSchema = z.object({
  spp_id: z.string().trim().uuid({ message: "Student payment phase is required." }),
  destination_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Destination payment phase is required." }),
});

export type TransferSppInput = z.infer<typeof transferSppSchema>;

export function parseTransferSppFormData(formData: FormData):
  | { success: true; data: TransferSppInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = transferSppSchema.safeParse({
    spp_id: formData.get("spp_id"),
    destination_payment_phase_id: formData.get("destination_payment_phase_id"),
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
