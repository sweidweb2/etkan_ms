import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { GUEST_PIPELINE_STATUS_VALUES } from "@/lib/constants/guest";

export const removeGuestStatusSchema = z.object({
  id: z.string().uuid({ message: "Invalid guest id." }),
  status: z.enum(GUEST_PIPELINE_STATUS_VALUES, {
    message: "Select a valid pipeline status.",
  }),
});

export type RemoveGuestStatusInput = z.infer<typeof removeGuestStatusSchema>;

export function parseRemoveGuestStatusFormData(formData: FormData) {
  return safeParseFormData(removeGuestStatusSchema, {
    id: formData.get("id"),
    status: formData.get("status"),
  });
}
