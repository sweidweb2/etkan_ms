import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

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

export function parseMarkNotificationReadFormData(formData: FormData) {
  return safeParseFormData(markNotificationReadSchema, {
    id: formData.get("id") || undefined,
    mark_all: formData.get("mark_all") ?? undefined,
  });
}
