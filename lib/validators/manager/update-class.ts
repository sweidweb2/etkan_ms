import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { CLASS_STATUS_VALUES } from "@/lib/constants/manager-class-status";

export { CLASS_STATUS_VALUES };

export const SUBJECT_TASK_MODES = ["keep", "replace"] as const;
export type SubjectTaskMode = (typeof SUBJECT_TASK_MODES)[number];

export const updateClassSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Class name is required." })
    .max(120, { message: "Class name must be at most 120 characters." }),
  subject_id: z
    .string()
    .trim()
    .min(1, { message: "Subject is required." }),
  status: z.enum(CLASS_STATUS_VALUES, {
    message: "Status is required.",
  }),
  semester_id: z.string().optional().or(z.literal("")),
  subject_task_mode: z.enum(SUBJECT_TASK_MODES).optional(),
});

export type UpdateClassInput = z.infer<typeof updateClassSchema>;

export const updateClassFormSchema = updateClassSchema.extend({
  class_id: z.string().uuid({ message: "Invalid class id." }),
});

export type UpdateClassFormInput = z.infer<typeof updateClassFormSchema>;

export function parseUpdateClassFormData(formData: FormData) {
  const subjectTaskModeRaw = String(
    formData.get("subject_task_mode") ?? ""
  ).trim();
  return safeParseFormData(updateClassFormSchema, {
    class_id: formData.get("class_id"),
    name: formData.get("name"),
    subject_id: formData.get("subject_id"),
    status: formData.get("status"),
    semester_id: formData.get("semester_id") ?? "",
    subject_task_mode: subjectTaskModeRaw || undefined,
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
