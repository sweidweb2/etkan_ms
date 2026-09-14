import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const notificationIdSchema = z.object({
  id: z.string().uuid({ message: "Notification id is required." }),
});

export type NotificationIdInput = z.infer<typeof notificationIdSchema>;

export function parseNotificationIdFormData(formData: FormData) {
  return safeParseFormData(notificationIdSchema, {
    id: formData.get("id"),
  });
}
