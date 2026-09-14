import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const assignClassTeacherSchema = z.object({
  class_id: z.string().uuid({ message: "Invalid class id." }),
  teacher_id: z.string().uuid({ message: "Please select a teacher." }),
});

export type AssignClassTeacherInput = z.infer<typeof assignClassTeacherSchema>;

export function parseAssignClassTeacherFormData(formData: FormData) {
  return safeParseFormData(assignClassTeacherSchema, {
    class_id: formData.get("class_id"),
    teacher_id: formData.get("teacher_id"),
  });
}

export const unassignClassTeacherSchema = z.object({
  class_id: z.string().uuid({ message: "Invalid class id." }),
  teacher_id: z.string().uuid({ message: "Please select a teacher." }),
});

export type UnassignClassTeacherInput = z.infer<
  typeof unassignClassTeacherSchema
>;

export function parseUnassignClassTeacherFormData(formData: FormData) {
  return safeParseFormData(unassignClassTeacherSchema, {
    class_id: formData.get("class_id"),
    teacher_id: formData.get("teacher_id"),
  });
}
