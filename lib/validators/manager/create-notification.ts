import { z } from "zod";
import {
  isNotificationActionHrefValidForAudience,
  NOTIFICATION_ACTION_NONE_VALUE,
} from "@/lib/constants/notification-action-pages";
import {
  NOTIFICATION_AUDIENCE_VALUES,
  NOTIFICATION_CATEGORY_VALUES,
  NOTIFICATION_PRIORITY_VALUES,
} from "@/lib/constants/manager-notification-display";

export const createNotificationSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: "Title is required." })
      .max(200, { message: "Title must be at most 200 characters." }),
    body: z
      .string()
      .trim()
      .min(1, { message: "Message is required." })
      .max(2000, { message: "Message must be at most 2000 characters." }),
    audience: z.enum(NOTIFICATION_AUDIENCE_VALUES, {
      message: "Audience is required.",
    }),
    category: z.enum(NOTIFICATION_CATEGORY_VALUES, {
      message: "Category is required.",
    }),
    priority: z.enum(NOTIFICATION_PRIORITY_VALUES, {
      message: "Priority is required.",
    }),
    action_href: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (
      !isNotificationActionHrefValidForAudience(
        values.audience,
        values.action_href
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Select a valid page for the chosen audience.",
        path: ["action_href"],
      });
    }
  });

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export { NOTIFICATION_ACTION_NONE_VALUE };
