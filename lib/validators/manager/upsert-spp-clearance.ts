import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  SPP_CLEARANCE_DURATION_DAYS_DEFAULT,
  SPP_CLEARANCE_DURATION_DAYS_MAX,
  SPP_CLEARANCE_DURATION_DAYS_MIN,
} from "@/lib/manager/accounting/spp-clearance";

export const createSppClearanceSchema = z.object({
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." }),
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

export const updateSppClearanceSchema = z.object({
  id: z.string().trim().uuid({ message: "Clearance is required." }),
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." }),
  duration_days: z.coerce
    .number({ message: "Duration is required." })
    .int({ message: "Duration must be a whole number of days." })
    .min(SPP_CLEARANCE_DURATION_DAYS_MIN, {
      message: `Duration must be at least ${SPP_CLEARANCE_DURATION_DAYS_MIN} day.`,
    })
    .max(SPP_CLEARANCE_DURATION_DAYS_MAX, {
      message: `Duration must be at most ${SPP_CLEARANCE_DURATION_DAYS_MAX} days.`,
    }),
  notes: z
    .string()
    .trim()
    .max(500, { message: "Notes must be at most 500 characters." })
    .optional()
    .or(z.literal("")),
});

export type CreateSppClearanceInput = z.infer<typeof createSppClearanceSchema>;
export type UpdateSppClearanceInput = z.infer<typeof updateSppClearanceSchema>;

export function parseCreateSppClearanceFormData(formData: FormData) {
  return safeParseFormData(createSppClearanceSchema, {
    student_payment_phase_id: formData.get("student_payment_phase_id"),
    duration_days:
      formData.get("duration_days") ?? SPP_CLEARANCE_DURATION_DAYS_DEFAULT,
    notes: formData.get("notes") ?? "",
  });
}

export function parseUpdateSppClearanceFormData(formData: FormData) {
  return safeParseFormData(updateSppClearanceSchema, {
    id: formData.get("id"),
    student_payment_phase_id: formData.get("student_payment_phase_id"),
    duration_days: formData.get("duration_days"),
    notes: formData.get("notes") ?? "",
  });
}
