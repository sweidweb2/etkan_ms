import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { CLASS_STATUS_VALUES } from "@/lib/constants/manager-class-status";
import { createClassSchema } from "@/lib/validators/manager/create-class";

export {
  CLASS_STATUS_VALUES,
  createClassSchema as updateClassSchema,
  type CreateClassInput as UpdateClassInput,
} from "@/lib/validators/manager/create-class";

export const updateClassFormSchema = createClassSchema.extend({
  class_id: z.string().uuid({ message: "Invalid class id." }),
});

export type UpdateClassFormInput = z.infer<typeof updateClassFormSchema>;

export function parseUpdateClassFormData(formData: FormData) {
  return safeParseFormData(updateClassFormSchema, {
    class_id: formData.get("class_id"),
    name: formData.get("name"),
    subject_id: formData.get("subject_id"),
    status: formData.get("status"),
    semester_id: formData.get("semester_id") ?? "",
  });
}

export const changeClassStatusSchema = z.object({
  class_id: z.string().uuid({ message: "Invalid class id." }),
  status: z.enum(CLASS_STATUS_VALUES, {
    message: "Status is required.",
  }),
});

export type ChangeClassStatusInput = z.infer<typeof changeClassStatusSchema>;

export function parseChangeClassStatusFormData(formData: FormData) {
  return safeParseFormData(changeClassStatusSchema, {
    class_id: formData.get("class_id"),
    status: formData.get("status"),
  });
}
