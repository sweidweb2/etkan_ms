import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const addStudentToClassSchema = z.object({
  studentProfileId: z
    .string()
    .trim()
    .min(1, { message: "Please select a student." }),
});

export type AddStudentToClassInput = z.infer<typeof addStudentToClassSchema>;

export function parseAddStudentToClassFormData(formData: FormData):
  | {
      success: true;
      data: AddStudentToClassInput & { class_id: string };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!class_id) {
    return { success: false, error: "Class is required." };
  }

  const parsed = addStudentToClassSchema.safeParse({
    studentProfileId: formData.get("studentProfileId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return {
    success: true,
    data: {
      class_id,
      ...parsed.data,
    },
  };
}
