import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { CLASS_STATUS_VALUES } from "@/lib/constants/manager-class-status";
import type { FieldErrors } from "@/types/auth";

export { CLASS_STATUS_VALUES };

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
});

export type CreateClassInput = z.infer<typeof createClassSchema>;

export function parseCreateClassFormData(formData: FormData):
  | { success: true; data: CreateClassInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createClassSchema.safeParse({
    name: formData.get("name"),
    subject_id: formData.get("subject_id"),
    status: formData.get("status"),
    semester_id: formData.get("semester_id") ?? "",
    teacher_id: formData.get("teacher_id") ?? "",
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
