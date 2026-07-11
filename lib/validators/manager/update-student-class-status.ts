import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { STUDENT_CLASS_STATUS_VALUES } from "@/lib/constants/manager-student-class-status";
import type { FieldErrors } from "@/types/auth";

export const updateStudentClassStatusSchema = z.object({
  status: z.enum(STUDENT_CLASS_STATUS_VALUES, {
    message: "Enrollment status is required.",
  }),
});

export type UpdateStudentClassStatusInput = z.infer<
  typeof updateStudentClassStatusSchema
>;

export function parseUpdateStudentClassStatusFormData(formData: FormData):
  | {
      success: true;
      data: UpdateStudentClassStatusInput & {
        id: string;
        class_id: string;
      };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const id = String(formData.get("id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!id || !class_id) {
    return { success: false, error: "Enrollment and class are required." };
  }

  const parsed = updateStudentClassStatusSchema.safeParse({
    status: formData.get("status"),
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
      id,
      class_id,
      ...parsed.data,
    },
  };
}
