import { z } from "zod";
import { SEMESTER_STATUS_VALUES } from "@/lib/constants/manager-semester-status";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const optionalStartDateSchema = z.preprocess(
  (value) => {
    if (value == null) {
      return null;
    }

    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Start date must be a valid date.",
    })
    .nullable()
);

export const createPhaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Semester name is required." })
    .max(120, { message: "Semester name must be at most 120 characters." }),
  nb_courses: z.coerce
    .number()
    .int({ message: "Number of courses must be a whole number." })
    .min(0, { message: "Number of courses must be 0 or greater." })
    .max(1000, { message: "Number of courses must be at most 1000." }),
  amount: z.coerce
    .number()
    .min(0, { message: "Amount must be 0 or greater." })
    .max(1000000, { message: "Amount must be at most 1,000,000." }),
  status: z.enum(SEMESTER_STATUS_VALUES, {
    message: "Status is required.",
  }),
  start_date: optionalStartDateSchema,
});

export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;

export function parseCreatePhaseFormData(formData: FormData):
  | { success: true; data: CreatePhaseInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createPhaseSchema.safeParse({
    name: formData.get("name"),
    nb_courses: formData.get("nb_courses"),
    amount: formData.get("amount"),
    status: formData.get("status"),
    start_date: formData.get("start_date"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(flattened),
    };
  }

  return { success: true, data: parsed.data };
}
