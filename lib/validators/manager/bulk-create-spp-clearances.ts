import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  SPP_CLEARANCE_DURATION_DAYS_DEFAULT,
  SPP_CLEARANCE_DURATION_DAYS_MAX,
  SPP_CLEARANCE_DURATION_DAYS_MIN,
} from "@/lib/manager/accounting/spp-clearance";

export const bulkCreateSppClearancesSchema = z.object({
  payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Payment phase is required." }),
  duration_days: z.coerce
    .number({ message: "Duration is required." })
    .int({ message: "Duration must be a whole number of days." })
    .min(SPP_CLEARANCE_DURATION_DAYS_MIN, {
      message: `Duration must be at least ${SPP_CLEARANCE_DURATION_DAYS_MIN} day.`,
    })
    .max(SPP_CLEARANCE_DURATION_DAYS_MAX, {
      message: `Duration must be at most ${SPP_CLEARANCE_DURATION_DAYS_MAX} days.`,
    })
    .default(SPP_CLEARANCE_DURATION_DAYS_DEFAULT),
  notes: z
    .string()
    .trim()
    .max(500, { message: "Notes must be at most 500 characters." })
    .optional()
    .or(z.literal("")),
});

export type BulkCreateSppClearancesInput = z.infer<
  typeof bulkCreateSppClearancesSchema
>;

export function parseBulkCreateSppClearancesFormData(formData: FormData) {
  return safeParseFormData(bulkCreateSppClearancesSchema, {
    payment_phase_id: formData.get("payment_phase_id"),
    duration_days:
      formData.get("duration_days") ?? SPP_CLEARANCE_DURATION_DAYS_DEFAULT,
    notes: formData.get("notes") ?? "",
  });
}
