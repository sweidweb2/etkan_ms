import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const optionalUrlField = z
  .string()
  .trim()
  .url({ message: "Please enter a valid URL." })
  .max(2048, { message: "URL must be at most 2048 characters." })
  .optional()
  .or(z.literal(""));

export const updateSubjectSchema = z.object({
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

export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

export type UpdateSubjectFormInput = UpdateSubjectInput & {
  id: string;
  class_count?: number;
};

export function parseUpdateSubjectFormData(formData: FormData):
  | {
      success: true;
      data: UpdateSubjectFormInput;
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return {
      success: false,
      error: "Unable to update subject. Please refresh and try again.",
    };
  }

  const parsed = updateSubjectSchema.safeParse({
    name: formData.get("name"),
    nb_sessions: formData.get("nb_sessions"),
    syllabus_link: formData.get("syllabus_link"),
    reference_link: formData.get("reference_link"),
    handout_link: formData.get("handout_link"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(flattened),
    };
  }

  return {
    success: true,
    data: {
      ...parsed.data,
      id,
      class_count: parseOptionalClassCount(formData.get("class_count")),
    },
  };
}

function parseOptionalClassCount(value: FormDataEntryValue | null): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
