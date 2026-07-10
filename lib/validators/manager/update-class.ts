import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { CLASS_STATUS_VALUES } from "@/lib/constants/manager-class-status";
import { createClassSchema } from "@/lib/validators/manager/create-class";
import type { FieldErrors } from "@/types/auth";

export {
  CLASS_STATUS_VALUES,
  createClassSchema as updateClassSchema,
  type CreateClassInput as UpdateClassInput,
} from "@/lib/validators/manager/create-class";

export const updateClassFormSchema = createClassSchema.extend({
  class_id: z.string().uuid({ message: "Invalid class id." }),
});

export type UpdateClassFormInput = z.infer<typeof updateClassFormSchema>;

export function parseUpdateClassFormData(formData: FormData):
  | { success: true; data: UpdateClassFormInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateClassFormSchema.safeParse({
    class_id: formData.get("class_id"),
    name: formData.get("name"),
    subject_id: formData.get("subject_id"),
    status: formData.get("status"),
    semester_id: formData.get("semester_id") ?? "",
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

export const changeClassStatusSchema = z.object({
  class_id: z.string().uuid({ message: "Invalid class id." }),
  status: z.enum(CLASS_STATUS_VALUES, {
    message: "Status is required.",
  }),
});

export type ChangeClassStatusInput = z.infer<typeof changeClassStatusSchema>;

export function parseChangeClassStatusFormData(formData: FormData):
  | { success: true; data: ChangeClassStatusInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = changeClassStatusSchema.safeParse({
    class_id: formData.get("class_id"),
    status: formData.get("status"),
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
