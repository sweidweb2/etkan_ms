import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const transferStudentBetweenClassesSchema = z
  .object({
    student_profile_id: z
      .string()
      .trim()
      .uuid({ message: "Please select a student." }),
    from_class_id: z
      .string()
      .trim()
      .uuid({ message: "Source class is required." }),
    to_class_id: z
      .string()
      .trim()
      .uuid({ message: "Destination class is required." }),
  })
  .refine((data) => data.from_class_id !== data.to_class_id, {
    message: "Destination class must be different from the current class.",
    path: ["to_class_id"],
  });

export type TransferStudentBetweenClassesInput = z.infer<
  typeof transferStudentBetweenClassesSchema
>;

export function parseTransferStudentBetweenClassesFormData(formData: FormData):
  | { success: true; data: TransferStudentBetweenClassesInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = transferStudentBetweenClassesSchema.safeParse({
    student_profile_id: formData.get("student_profile_id"),
    from_class_id: formData.get("from_class_id"),
    to_class_id: formData.get("to_class_id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
