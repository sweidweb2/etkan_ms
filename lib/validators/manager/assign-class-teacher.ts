import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const assignClassTeacherSchema = z.object({
  class_id: z.string().uuid({ message: "Invalid class id." }),
  teacher_id: z.string().uuid({ message: "Please select a teacher." }),
});

export type AssignClassTeacherInput = z.infer<typeof assignClassTeacherSchema>;

export function parseAssignClassTeacherFormData(formData: FormData):
  | { success: true; data: AssignClassTeacherInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = assignClassTeacherSchema.safeParse({
    class_id: formData.get("class_id"),
    teacher_id: formData.get("teacher_id"),
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

export const unassignClassTeacherSchema = z.object({
  class_id: z.string().uuid({ message: "Invalid class id." }),
  teacher_id: z.string().uuid({ message: "Please select a teacher." }),
});

export type UnassignClassTeacherInput = z.infer<
  typeof unassignClassTeacherSchema
>;

export function parseUnassignClassTeacherFormData(formData: FormData):
  | { success: true; data: UnassignClassTeacherInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = unassignClassTeacherSchema.safeParse({
    class_id: formData.get("class_id"),
    teacher_id: formData.get("teacher_id"),
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
