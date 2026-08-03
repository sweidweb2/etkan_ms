import { z } from "zod";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const booleanFromForm = z.preprocess((value) => {
  if (value === true || value === "true" || value === "on" || value === "1") {
    return true;
  }
  if (value === false || value === "false" || value === "" || value == null) {
    return false;
  }
  return value;
}, z.boolean());

export const changeStudentStatusSchema = z
  .object({
    user_id: z.string().uuid({ message: "Invalid user id." }),
    target_status: z.enum(
      [STUDENT_STATUSES.ACTIVE, STUDENT_STATUSES.INACTIVE],
      {
        message: "Select activate or inactivate.",
      }
    ),
    remove_from_classes: booleanFromForm.default(false),
    remove_open_spps: booleanFromForm.default(false),
  })
  .superRefine((data, ctx) => {
    if (data.target_status === STUDENT_STATUSES.ACTIVE) {
      if (data.remove_from_classes) {
        ctx.addIssue({
          code: "custom",
          path: ["remove_from_classes"],
          message: "Class removal is only allowed when inactivating.",
        });
      }
      if (data.remove_open_spps) {
        ctx.addIssue({
          code: "custom",
          path: ["remove_open_spps"],
          message: "SPP deletion is only allowed when inactivating.",
        });
      }
    }
  });

export type ChangeStudentStatusInput = z.infer<typeof changeStudentStatusSchema>;

export function parseChangeStudentStatusFormData(formData: FormData):
  | { success: true; data: ChangeStudentStatusInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = changeStudentStatusSchema.safeParse({
    user_id: formData.get("user_id"),
    target_status: formData.get("target_status"),
    remove_from_classes: formData.get("remove_from_classes"),
    remove_open_spps: formData.get("remove_open_spps"),
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
