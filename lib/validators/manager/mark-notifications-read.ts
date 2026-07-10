import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const markNotificationReadSchema = z
  .object({
    id: z.string().uuid().optional(),
    mark_all: z.coerce.boolean().optional(),
  })
  .superRefine((values, context) => {
    if (!values.mark_all && !values.id) {
      context.addIssue({
        code: "custom",
        message: "Notification id is required.",
        path: ["id"],
      });
    }
  });

export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;

export function parseMarkNotificationReadFormData(formData: FormData):
  | { success: true; data: MarkNotificationReadInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = markNotificationReadSchema.safeParse({
    id: formData.get("id") || undefined,
    mark_all: formData.get("mark_all") ?? undefined,
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
