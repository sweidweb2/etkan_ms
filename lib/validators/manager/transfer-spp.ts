import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const transferSppSchema = z.object({
  spp_id: z.string().trim().uuid({ message: "Student payment phase is required." }),
  destination_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Destination payment phase is required." }),
});

export type TransferSppInput = z.infer<typeof transferSppSchema>;

export function parseTransferSppFormData(formData: FormData) {
  return safeParseFormData(transferSppSchema, {
    spp_id: formData.get("spp_id"),
    destination_payment_phase_id: formData.get("destination_payment_phase_id"),
  });
}
