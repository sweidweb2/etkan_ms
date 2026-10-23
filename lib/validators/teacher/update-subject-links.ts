import { z } from "zod";
import {
  formValidationFailure,
  safeParseFormData,
} from "@/lib/validators/safe-parse-form-data";

const optionalUrlField = z
  .string()
  .trim()
  .url({ message: "Please enter a valid URL." })
  .max(2048, { message: "URL must be at most 2048 characters." })
  .optional()
  .or(z.literal(""));

export const updateSubjectLinksSchema = z.object({
  syllabus_link: optionalUrlField,
  reference_link: optionalUrlField,
  handout_link: optionalUrlField,
});

export type UpdateSubjectLinksInput = z.infer<typeof updateSubjectLinksSchema>;

export type UpdateSubjectLinksFormInput = UpdateSubjectLinksInput & {
  id: string;
};

export function parseUpdateSubjectLinksFormData(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return formValidationFailure(
      undefined,
      "Unable to update subject. Please refresh and try again."
    );
  }

  const parsed = safeParseFormData(updateSubjectLinksSchema, {
    syllabus_link: formData.get("syllabus_link"),
    reference_link: formData.get("reference_link"),
    handout_link: formData.get("handout_link"),
  });

  if (!parsed.success) {
    return parsed;
  }

  return {
    success: true as const,
    data: {
      ...parsed.data,
      id,
    },
  };
}
