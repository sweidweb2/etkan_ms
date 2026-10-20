import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const bulkDeleteSppClearancesSchema = z.object({
  payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Payment phase is required." }),
});

export type BulkDeleteSppClearancesInput = z.infer<
  typeof bulkDeleteSppClearancesSchema
>;

export function parseBulkDeleteSppClearancesFormData(formData: FormData) {
  return safeParseFormData(bulkDeleteSppClearancesSchema, {
    payment_phase_id: formData.get("payment_phase_id"),
  });
}
