import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

const optionalUrlField = z
  .string()
  .trim()
  .url({ message: "Please enter a valid URL." })
  .max(2048, { message: "URL must be at most 2048 characters." })
  .optional()
  .or(z.literal(""));

/** Shared fields for create and update subject. */
export const subjectFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Subject name is required." })
    .max(120, { message: "Subject name must be at most 120 characters." }),
  nb_sessions: z.coerce
    .number()
    .int({ message: "Number of sessions must be a whole number." })
    .min(0, { message: "Number of sessions must be 0 or greater." })
    .max(1000, { message: "Number of sessions must be at most 1000." }),
  syllabus_link: optionalUrlField,
  reference_link: optionalUrlField,
  handout_link: optionalUrlField,
});

export const createSubjectSchema = subjectFieldsSchema;

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export function parseCreateSubjectFormData(formData: FormData) {
  return safeParseFormData(createSubjectSchema, {
    name: formData.get("name"),
    nb_sessions: formData.get("nb_sessions"),
    syllabus_link: formData.get("syllabus_link"),
    reference_link: formData.get("reference_link"),
    handout_link: formData.get("handout_link"),
  });
}
