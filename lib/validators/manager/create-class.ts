import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { CLASS_STATUS_VALUES } from "@/lib/constants/manager-class-status";

export { CLASS_STATUS_VALUES };

const booleanFromForm = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "on" || value === "1") return true;
  if (value === "false" || value === "" || value == null) return false;
  return value;
}, z.boolean());

export const createClassSchema = z.object({
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
  teacher_id: z.string().optional().or(z.literal("")),
  clone_subject_tasks: booleanFromForm.default(false),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;

export function parseCreateClassFormData(formData: FormData) {
  return safeParseFormData(createClassSchema, {
    name: formData.get("name"),
    subject_id: formData.get("subject_id"),
    status: formData.get("status"),
    semester_id: formData.get("semester_id") ?? "",
    teacher_id: formData.get("teacher_id") ?? "",
    clone_subject_tasks: formData.get("clone_subject_tasks") ?? "false",
  });
}
