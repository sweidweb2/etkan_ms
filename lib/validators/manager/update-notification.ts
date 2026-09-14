import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { createNotificationSchema } from "@/lib/validators/manager/create-notification";

export const updateNotificationSchema = createNotificationSchema.extend({
  id: z.string().uuid({ message: "Notification id is required." }),
});

export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;

export function parseUpdateNotificationFormData(formData: FormData) {
  return safeParseFormData(updateNotificationSchema, {
    id: formData.get("id"),
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    action_href: formData.get("action_href") ?? undefined,
  });
}
