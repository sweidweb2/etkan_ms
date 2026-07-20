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
  syllabus_link: optionalUrlField,
  reference_link: optionalUrlField,
  handout_link: optionalUrlField,
});

export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

export function parseUpdateSubjectFormData(formData: FormData):
  | {
      success: true;
      data: UpdateSubjectInput & { id: string };
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
    },
  };
}
