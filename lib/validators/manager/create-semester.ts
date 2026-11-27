import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const SEMESTER_CODE_PATTERN = /^\d{4}$/;

const SEMESTER_CODE_MESSAGE = "Semester code must be exactly 4 digits.";

export const semesterCodeSchema = z
  .string()
  .trim()
  .regex(SEMESTER_CODE_PATTERN, { message: SEMESTER_CODE_MESSAGE });

/** Shared fields for create and update semester. */
export const semesterFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Semester name is required." })
    .max(120, { message: "Semester name must be at most 120 characters." }),
});

/** Blank `semester_code` means "generate one automatically". */
export const createSemesterSchema = semesterFieldsSchema.extend({
  semester_code: z
    .string()
    .trim()
    .refine((value) => value === "" || SEMESTER_CODE_PATTERN.test(value), {
      message: SEMESTER_CODE_MESSAGE,
    })
    .optional(),
});

export type CreateSemesterInput = z.infer<typeof createSemesterSchema>;

export function parseCreateSemesterFormData(formData: FormData) {
  return safeParseFormData(createSemesterSchema, {
    name: formData.get("name"),
    semester_code: formData.get("semester_code") ?? "",
  });
}
