import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const SEMESTER_CODE_PATTERN = /^\d{4}$/;

const SEMESTER_CODE_MESSAGE = "Semester code must be exactly 4 digits.";

export const semesterCodeSchema = z
  .string()
  .trim()
  .regex(SEMESTER_CODE_PATTERN, { message: SEMESTER_CODE_MESSAGE });

/** Shared fields for create and update semester (phase). */
export const phaseFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Semester name is required." })
    .max(120, { message: "Semester name must be at most 120 characters." }),
});

/** Blank `semester_code` means "generate one automatically". */
export const createPhaseSchema = phaseFieldsSchema.extend({
  semester_code: z
    .string()
    .trim()
    .refine((value) => value === "" || SEMESTER_CODE_PATTERN.test(value), {
      message: SEMESTER_CODE_MESSAGE,
    })
    .optional(),
});

export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;

export function parseCreatePhaseFormData(formData: FormData) {
  return safeParseFormData(createPhaseSchema, {
    name: formData.get("name"),
    semester_code: formData.get("semester_code") ?? "",
  });
}
