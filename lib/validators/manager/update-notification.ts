import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { createNotificationSchema } from "@/lib/validators/manager/create-notification";
import type { FieldErrors } from "@/types/auth";

export const updateNotificationSchema = createNotificationSchema.extend({
  id: z.string().uuid({ message: "Notification id is required." }),
});

export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;

export function parseUpdateNotificationFormData(formData: FormData):
  | { success: true; data: UpdateNotificationInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateNotificationSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    action_href: formData.get("action_href") ?? undefined,
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
